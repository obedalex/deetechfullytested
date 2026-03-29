// backend/src/controllers/orderController.js
import Order from "../models/Order.js";
import Product from "../models/Product.js";
import DiscountCode from "../models/DiscountCode.js";
import Affiliate from "../models/Affiliate.js";
import Referral from "../models/Referral.js";
import fsPromises from "fs/promises";
import path from "path";
import { createOrderSchema, createGuestOrderSchema } from "../validators/orderSchemas.js";
import { ADMIN_EMAIL } from "../config/env.js";
import { sendOrderNotification, sendOrderConfirmation } from "../utils/emailService.js";

async function processOrderItems(orderItems, session) {
  let total = 0;
  const processedItems = [];

  for (const item of orderItems) {
    const qty = Number(item?.qty);
    if (!Number.isInteger(qty) || qty < 1) {
      throw new Error("Invalid order quantity");
    }

    const product = session
      ? await Product.findById(item.product).session(session)
      : await Product.findById(item.product);
    if (!product) throw new Error(`Product not found: ${item.product}`);

    const currentStock = Number(
      product.countInStock ??
        product.get?.("stock_quantity") ??
        product.get?.("stock") ??
        product.stock_quantity ??
        product.stock ??
        0
    );
    const safeStock = Number.isFinite(currentStock) ? Math.max(0, currentStock) : 0;
    if (safeStock < qty) {
      throw new Error(`Not enough stock for ${product.name}`);
    }

    const price = product.price;

    total += qty * price;
    processedItems.push({
      product: product._id,
      qty,
      price,
    });
  }

  return { total, processedItems };
}

async function reserveStockAdjustments(adjustments = []) {
  const reserved = [];
  for (const adj of adjustments) {
    const qty = Number(adj?.qty || 0);
    if (!adj?.productId || !Number.isInteger(qty) || qty < 1) continue;

    const updated = await Product.findOneAndUpdate(
      { _id: adj.productId, countInStock: { $gte: qty } },
      { $inc: { countInStock: -qty, sold: qty } },
      { new: true }
    );
    if (!updated) {
      throw new Error("One or more items are out of stock. Please refresh and try again.");
    }
    reserved.push({ productId: adj.productId, qty });
  }
  return reserved;
}

async function rollbackStockAdjustments(adjustments = []) {
  for (const adj of adjustments) {
    const qty = Number(adj?.qty || 0);
    if (!adj?.productId || !Number.isInteger(qty) || qty < 1) continue;

    await Product.updateOne(
      { _id: adj.productId },
      { $inc: { countInStock: qty, sold: -qty } }
    );
  }
}

async function applyDiscount(codeRaw, total, userId, session) {
  const code = String(codeRaw || "").trim().toUpperCase();
  if (!code) return { total, discount: null };

  const finder = DiscountCode.findOne({ code, used: false });
  const doc = session ? await finder.session(session) : await finder;

  if (!doc) {
    // Discount codes should never block order placement.
    return { total, discount: null };
  }

  const percent = doc.percent || 0;
  const discountAmount = (total * percent) / 100;
  const newTotal = Math.max(0, total - discountAmount);

  return {
    total: newTotal,
    discount: { code: doc.code, percent, amount: discountAmount, _id: doc._id, userId },
  };
}

async function consumeDiscountCode(discount, userId, orderId) {
  if (!discount?._id) return true;
  const updateDoc = {
    $set: {
      used: true,
      usedAt: new Date(),
      usedBy: userId || undefined,
    },
  };
  if (orderId) {
    updateDoc.$set.order = orderId;
  }
  const result = await DiscountCode.updateOne(
    { _id: discount._id, used: false },
    updateDoc
  );
  return Number(result?.modifiedCount || 0) > 0;
}

async function releaseDiscountCode(discount) {
  if (!discount?._id) return;
  await DiscountCode.updateOne(
    { _id: discount._id },
    { $set: { used: false }, $unset: { usedAt: 1, usedBy: 1, order: 1 } }
  );
}

async function removePaymentProofFile(rawUrl) {
  try {
    await deleteStoredMedia(rawUrl);
  } catch (err) {
    console.warn("Payment proof file cleanup skipped:", err?.message || err);
  }
}

function normalizeAffiliateCode(raw) {
  return String(raw || "").trim().toUpperCase();
}

async function findAffiliateByCodeFlexible(code, session = null) {
  const normalized = normalizeAffiliateCode(code);
  if (!normalized) return null;
  const query = Affiliate.findOne({
    isActive: true,
    $or: [{ code: normalized }, { affiliateCode: normalized }, { affiliate_code: normalized }],
  });
  return session ? query.session(session) : query;
}

async function findAffiliateByCodeAnyStatus(code, session = null) {
  const normalized = normalizeAffiliateCode(code);
  if (!normalized) return null;
  const query = Affiliate.findOne({
    $or: [{ code: normalized }, { affiliateCode: normalized }, { affiliate_code: normalized }],
  });
  return session ? query.session(session) : query;
}

function normalizeOrderStatus(order) {
  if (!order) return "pending";
  if (order.orderStatus === "cancelled" || order.paymentStatus === "failed") {
    return "cancelled";
  }
  if (order.orderStatus === "delivered" || order.isDelivered === true) {
    return "earned";
  }
  return "pending";
}

function pickOrderCustomer(order) {
  return {
    name: String(order.shippingName || order.guestName || "").trim(),
    email: String(order.shippingEmail || order.guestEmail || "").trim(),
  };
}

function buildOrderItemsForEmail(order) {
  const items = Array.isArray(order?.orderItems) ? order.orderItems : [];
  return items.map((item) => {
    const qty = Number(item?.qty || item?.quantity || 0);
    const price = Number(item?.price || 0);
    const productName =
      String(item?.name || "").trim() ||
      String(item?.product?.name || "").trim() ||
      String(item?.product || "").trim() ||
      "Product";
    return {
      qty,
      quantity: qty,
      price,
      name: productName,
      product: item?.product?._id || item?.product,
    };
  });
}

async function sendOrderEmailsBestEffort(order) {
  if (!order) return;
  const customer = pickOrderCustomer(order);
  const orderDetails = {
    id: String(order._id || ""),
    createdAt: order.createdAt || new Date(),
    customerName: customer.name || "Customer",
    customerEmail: customer.email || "",
    mobileNumber: String(order.mobileNumber || "").trim(),
    deliveryAddress: String(order.shippingAddress || order.guestAddress || "").trim(),
    deliveryRegion: String(order.deliveryRegion || order.shippingCity || order.guestCity || "").trim(),
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    orderStatus: order.orderStatus,
    guestNotes: String(order.guestNotes || "").trim(),
    paymentScreenshotUrl: String(order.paymentScreenshotUrl || "").trim(),
    totalPrice: Number(order.totalPrice || 0),
    orderItems: buildOrderItemsForEmail(order),
  };

  try {
    if (ADMIN_EMAIL) {
      await sendOrderNotification(ADMIN_EMAIL, orderDetails);
    }
    if (customer.email) {
      await sendOrderConfirmation(customer.email, orderDetails);
    }
  } catch (err) {
    console.warn("Backend order email send skipped:", err?.message || err);
  }
}

async function resolveAffiliateByCode(codeRaw, buyerUserId, session) {
  const code = normalizeAffiliateCode(codeRaw);
  if (!code) return null;

  try {
    const affiliate = await findAffiliateByCodeFlexible(code, session);

    // Affiliate code must never block checkout; ignore invalid/inactive codes.
    if (!affiliate) return null;

    // Prevent self-referral but continue order creation.
    if (buyerUserId && String(affiliate.user) === String(buyerUserId)) {
      return null;
    }

    return affiliate;
  } catch (err) {
    // Defensive fallback: never fail order flow because of affiliate lookup.
    console.warn("Affiliate lookup skipped:", err?.message || err);
    return null;
  }
}

async function reconcileAffiliateOnOrder(order) {
  if (!order) return order;
  let affiliate = null;

  if (order.affiliate) {
    affiliate = await Affiliate.findById(order.affiliate);
  }

  if (!affiliate) {
    const candidateCode = normalizeAffiliateCode(order.affiliateCode || order.affiliateCodeEntered);
    if (candidateCode) {
      affiliate = await resolveAffiliateByCode(candidateCode, order.user || null);
      if (!affiliate) {
        // Recovery path for historical orders that were created while code was valid.
        affiliate = await findAffiliateByCodeAnyStatus(candidateCode);
      }
    }
  }

  if (!affiliate) return order;

  const commissionRate = Number(
    order.affiliateCommissionRate > 0 ? order.affiliateCommissionRate : affiliate.commissionRate || 5
  );
  const commissionAmount = Number(
    ((Number(order.totalPrice || 0) * commissionRate) / 100).toFixed(2)
  );

  let changed = false;
  if (!order.affiliate || String(order.affiliate) !== String(affiliate._id)) {
    order.affiliate = affiliate._id;
    changed = true;
  }
  if (!normalizeAffiliateCode(order.affiliateCode)) {
    order.affiliateCode = affiliate.code;
    changed = true;
  }
  if (Number(order.affiliateCommissionRate || 0) <= 0) {
    order.affiliateCommissionRate = commissionRate;
    changed = true;
  }
  if (Number(order.affiliateCommissionAmount || 0) <= 0 && Number(order.totalPrice || 0) > 0) {
    order.affiliateCommissionAmount = commissionAmount;
    changed = true;
  }

  if (changed) {
    await order.save();
  }
  return order;
}

async function ensureReferralSyncedForOrder(order) {
  let current = order;
  if (!current) return null;
  current = await reconcileAffiliateOnOrder(current);
  if (current.affiliate) {
    await upsertReferralForOrder(current);
  }
  return current;
}

async function upsertReferralForOrder(order, session = null) {
  if (!order) return null;

  let affiliate = null;
  if (order.affiliate) {
    affiliate = await Affiliate.findById(order.affiliate);
  }

  if (!affiliate) {
    const fallbackCode = normalizeAffiliateCode(order.affiliateCode || order.affiliateCodeEntered);
    if (fallbackCode) {
      affiliate = await findAffiliateByCodeAnyStatus(fallbackCode, session);
      if (affiliate) {
        order.affiliate = affiliate._id;
      }
    }
  }

  if (!affiliate) return null;

  const resolvedCode = normalizeAffiliateCode(order.affiliateCode) || normalizeAffiliateCode(affiliate.code);
  const resolvedRate = Number(order.affiliateCommissionRate || affiliate.commissionRate || 5);
  const resolvedAmount = Number(
    (
      Number(order.affiliateCommissionAmount || 0) > 0
        ? Number(order.affiliateCommissionAmount || 0)
        : (Number(order.totalPrice || 0) * resolvedRate) / 100
    ).toFixed(2)
  );

  let orderChanged = false;
  if (!normalizeAffiliateCode(order.affiliateCode) && resolvedCode) {
    order.affiliateCode = resolvedCode;
    orderChanged = true;
  }
  if (Number(order.affiliateCommissionRate || 0) <= 0 && resolvedRate > 0) {
    order.affiliateCommissionRate = resolvedRate;
    orderChanged = true;
  }
  if (Number(order.affiliateCommissionAmount || 0) <= 0 && resolvedAmount >= 0) {
    order.affiliateCommissionAmount = resolvedAmount;
    orderChanged = true;
  }
  if (orderChanged) {
    await order.save();
  }

  const status = normalizeOrderStatus(order);
  const base = {
    affiliate: affiliate._id,
    order: order._id,
    affiliateCode: resolvedCode,
    commissionRate: resolvedRate,
    orderAmount: Number(order.totalPrice || 0),
    commissionAmount: resolvedAmount,
    status,
    customerName: pickOrderCustomer(order).name,
    customerEmail: pickOrderCustomer(order).email,
    paidAt: status === "earned" ? new Date() : null,
    cancelledAt: status === "cancelled" ? new Date() : null,
  };

  const update = {
    $set: {
      affiliate: base.affiliate,
      affiliateCode: base.affiliateCode,
      commissionRate: base.commissionRate,
      orderAmount: base.orderAmount,
      commissionAmount: base.commissionAmount,
      status: base.status,
      customerName: base.customerName,
      customerEmail: base.customerEmail,
      paidAt: base.paidAt,
      cancelledAt: base.cancelledAt,
    },
    $setOnInsert: {
      order: base.order,
    },
  };

  const op = Referral.findOneAndUpdate({ order: order._id }, update, {
    upsert: true,
    new: true,
  });

  return session ? op.session(session) : op;
}

// Create new order (authenticated)
export async function createOrder(req, res) {
  let payload = req.body;
  try {
    payload = req.body?.order ? JSON.parse(req.body.order) : req.body;
  } catch {
    res.status(400);
    throw new Error("Invalid order payload");
  }

  const { error } = createOrderSchema.validate(payload);
  if (error) {
    res.status(400);
    throw new Error(error.details[0].message);
  }

  const {
    orderItems,
    paymentMethod,
    deliveryRegion,
    mobileNumber,
    shippingName,
    shippingEmail,
    shippingAddress,
    shippingCity,
    clientOrderRef,
    paymentScreenshotUrl,
    discountCode,
    affiliateCode,
  } = payload;
  const submittedAffiliateCode = normalizeAffiliateCode(affiliateCode);

  if (!orderItems || orderItems.length === 0) {
    res.status(400);
    throw new Error("No order items provided");
  }
  if (!deliveryRegion) {
    res.status(400);
    throw new Error("Delivery region is required");
  }
  if (!paymentMethod) {
    res.status(400);
    throw new Error("Payment method is required");
  }
  if (!mobileNumber) {
    res.status(400);
    throw new Error("Mobile number is required");
  }
  const screenshotUrl = String(paymentScreenshotUrl || "").trim();

  if (!screenshotUrl) {
    res.status(400);
    throw new Error("Payment screenshot is required");
  }

  const cleanMobile = mobileNumber.trim();
  const trimmedOrderRef = String(clientOrderRef || "").trim();

  if (trimmedOrderRef) {
    const existingOrder = await Order.findOne({
      user: req.user._id,
      clientOrderRef: trimmedOrderRef,
    }).sort({ createdAt: -1 });
    if (existingOrder) {
      return res.status(200).json({
        message: "Order already submitted",
        order: existingOrder,
        orderId: existingOrder._id,
      });
    }
  }

  let reservedStock = [];
  let usedDiscount = null;
  try {
    const { total, processedItems } = await processOrderItems(orderItems);
    const discounted = await applyDiscount(discountCode, total, req.user?._id);
    const affiliate = await resolveAffiliateByCode(affiliateCode, req.user?._id);
    const commissionRate = Number(affiliate?.commissionRate || 5);
    const commissionAmount = affiliate
      ? Number(((discounted.total * commissionRate) / 100).toFixed(2))
      : 0;

    const stockAdjustments = processedItems.map((item) => ({
      productId: item.product,
      qty: Number(item.qty || 0),
    }));
    reservedStock = await reserveStockAdjustments(stockAdjustments);

    if (discounted.discount) {
      const consumed = await consumeDiscountCode(discounted.discount, req.user?._id, null);
      if (!consumed) {
        throw new Error("Discount code is no longer available");
      }
      usedDiscount = discounted.discount;
    }

    const order = await Order.create({
      user: req.user._id,
      orderItems: processedItems,
      paymentMethod,
      deliveryRegion,
      mobileNumber: cleanMobile,
      shippingName,
      shippingEmail,
      shippingAddress,
      shippingCity,
      clientOrderRef: trimmedOrderRef || undefined,
      totalPrice: discounted.total,
      paymentStatus: "pending",
      orderStatus: "pending",
      isDelivered: false,
      discountCode: discounted.discount?.code,
      discountPercent: discounted.discount?.percent,
      discountAmount: discounted.discount?.amount || 0,
      affiliateCodeEntered: submittedAffiliateCode || undefined,
      affiliateCode: affiliate?.code,
      affiliate: affiliate?._id,
      affiliateCommissionRate: affiliate ? commissionRate : 0,
      affiliateCommissionAmount: commissionAmount,
      paymentScreenshotUrl: screenshotUrl,
    });

    if (usedDiscount) {
      await DiscountCode.updateOne(
        { _id: usedDiscount._id },
        { $set: { order: order._id } }
      );
    }
    try {
      await ensureReferralSyncedForOrder(order);
    } catch (referralError) {
      console.warn("Referral sync skipped:", referralError?.message || referralError);
    }

    try {
      const orderForEmail = await Order.findById(order._id).populate("orderItems.product", "name");
      await sendOrderEmailsBestEffort(orderForEmail || order);
    } catch (emailError) {
      console.warn("Order email dispatch skipped:", emailError?.message || emailError);
    }

    return res.status(201).json({
      message: "Order created successfully",
      order,
      orderId: order?._id,
    });
  } catch (err) {
    if (err?.code === 11000 && trimmedOrderRef) {
      const existingOrder = await Order.findOne({
        user: req.user._id,
        clientOrderRef: trimmedOrderRef,
      }).sort({ createdAt: -1 });
      if (existingOrder) {
        return res.status(200).json({
          message: "Order already submitted",
          order: existingOrder,
          orderId: existingOrder._id,
        });
      }
    }
    if (reservedStock.length) {
      await rollbackStockAdjustments(reservedStock);
    }
    if (usedDiscount) {
      await releaseDiscountCode(usedDiscount);
    }
    res.status(400);
    throw new Error(err.message);
  }
}

// Create guest order (multipart)
export async function createGuestOrder(req, res) {
  let payload = {};
  try {
    payload = req.body.order ? JSON.parse(req.body.order) : req.body;
  } catch {
    res.status(400);
    throw new Error("Invalid order payload");
  }

  const { error } = createGuestOrderSchema.validate(payload);
  if (error) {
    res.status(400);
    throw new Error(error.details[0].message);
  }

  const {
    orderItems,
    paymentMethod,
    deliveryRegion,
    mobileNumber,
    shippingName,
    shippingEmail,
    shippingAddress,
    shippingCity,
    guestName,
    guestEmail,
    guestAddress,
    guestCity,
    guestNotes,
    clientOrderRef,
    paymentScreenshotUrl,
    discountCode,
    affiliateCode,
  } = payload;
  const submittedAffiliateCode = normalizeAffiliateCode(affiliateCode);
  const trimmedOrderRef = String(clientOrderRef || "").trim();

  const screenshotUrl = String(paymentScreenshotUrl || "").trim();

  if (!screenshotUrl) {
    res.status(400);
    throw new Error("Payment screenshot is required");
  }

  if (trimmedOrderRef) {
    const existingGuestOrder = await Order.findOne({
      clientOrderRef: trimmedOrderRef,
      $or: [
        { guestEmail: String(guestEmail || "").trim() },
        { shippingEmail: String(shippingEmail || "").trim() },
      ],
    }).sort({ createdAt: -1 });
    if (existingGuestOrder) {
      return res.status(200).json({
        message: "Order already submitted",
        order: existingGuestOrder,
        orderId: existingGuestOrder._id,
      });
    }
  }

  let reservedStock = [];
  let usedDiscount = null;
  try {
    const { total, processedItems } = await processOrderItems(orderItems);
    const discounted = await applyDiscount(discountCode, total, null);
    const affiliate = await resolveAffiliateByCode(affiliateCode, null);
    const commissionRate = Number(affiliate?.commissionRate || 5);
    const commissionAmount = affiliate
      ? Number(((discounted.total * commissionRate) / 100).toFixed(2))
      : 0;

    const stockAdjustments = processedItems.map((item) => ({
      productId: item.product,
      qty: Number(item.qty || 0),
    }));
    reservedStock = await reserveStockAdjustments(stockAdjustments);

    if (discounted.discount) {
      const consumed = await consumeDiscountCode(discounted.discount, null, null);
      if (!consumed) {
        throw new Error("Discount code is no longer available");
      }
      usedDiscount = discounted.discount;
    }

    const order = await Order.create({
      user: null,
      orderItems: processedItems,
      paymentMethod,
      deliveryRegion,
      mobileNumber: mobileNumber.trim(),
      shippingName: shippingName || guestName,
      shippingEmail: shippingEmail || guestEmail,
      shippingAddress: shippingAddress || guestAddress,
      shippingCity: shippingCity || guestCity,
      clientOrderRef: trimmedOrderRef || undefined,
      totalPrice: discounted.total,
      paymentStatus: "pending",
      orderStatus: "pending",
      isDelivered: false,
      discountCode: discounted.discount?.code,
      discountPercent: discounted.discount?.percent,
      discountAmount: discounted.discount?.amount || 0,
      affiliateCodeEntered: submittedAffiliateCode || undefined,
      affiliateCode: affiliate?.code,
      affiliate: affiliate?._id,
      affiliateCommissionRate: affiliate ? commissionRate : 0,
      affiliateCommissionAmount: commissionAmount,
      guestName,
      guestEmail,
      guestAddress,
      guestCity,
      guestNotes,
      paymentScreenshotUrl: screenshotUrl,
    });

    if (usedDiscount) {
      await DiscountCode.updateOne(
        { _id: usedDiscount._id },
        { $set: { order: order._id } }
      );
    }
    try {
      await ensureReferralSyncedForOrder(order);
    } catch (referralError) {
      console.warn("Referral sync skipped:", referralError?.message || referralError);
    }

    try {
      const orderForEmail = await Order.findById(order._id).populate("orderItems.product", "name");
      await sendOrderEmailsBestEffort(orderForEmail || order);
    } catch (emailError) {
      console.warn("Order email dispatch skipped:", emailError?.message || emailError);
    }

    return res.status(201).json({
      message: "Order created successfully",
      order,
      orderId: order?._id,
    });
  } catch (err) {
    if (err?.code === 11000 && trimmedOrderRef) {
      const existingGuestOrder = await Order.findOne({
        clientOrderRef: trimmedOrderRef,
      }).sort({ createdAt: -1 });
      if (existingGuestOrder) {
        return res.status(200).json({
          message: "Order already submitted",
          order: existingGuestOrder,
          orderId: existingGuestOrder._id,
        });
      }
    }
    if (reservedStock.length) {
      await rollbackStockAdjustments(reservedStock);
    }
    if (usedDiscount) {
      await releaseDiscountCode(usedDiscount);
    }
    res.status(400);
    throw new Error(err.message);
  }
}

// Get logged-in user's orders
export async function getMyOrders(req, res) {
  const orders = await Order.find({ user: req.user._id })
    .sort({ createdAt: -1 })
    .populate("orderItems.product", "name price brand");
  res.json(orders);
}

// Get all orders (admin only)
export async function getAllOrders(req, res) {
  const orders = await Order.find()
    .sort({ createdAt: -1 })
    .populate("user", "name email")
    .populate("orderItems.product", "name price brand");
  res.json(orders);
}

// Mark order as paid (admin only)
export async function updateOrderToPaid(req, res) {
  let order = await Order.findById(req.params.id);
  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }

  order.paymentStatus = "paid";
  order.paidAt = new Date();

  await order.save();
  order = await ensureReferralSyncedForOrder(order);
  res.json(order);
}

// Mark order as delivered (admin only)
export async function updateOrderToDelivered(req, res) {
  let order = await Order.findById(req.params.id);
  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }

  order.isDelivered = true;
  order.deliveredAt = new Date();
  order.orderStatus = "delivered";

  await order.save();
  order = await ensureReferralSyncedForOrder(order);
  res.json(order);
}

// Update order status (admin only)
export async function updateOrderStatus(req, res) {
  const { status } = req.body;
  const allowed = ["pending", "processing", "shipped", "delivered", "cancelled"];
  if (!allowed.includes(status)) {
    res.status(400);
    throw new Error("Invalid order status");
  }

  let order = await Order.findById(req.params.id);
  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }

  order.orderStatus = status;
  if (status === "pending") {
    order.paymentStatus = "pending";
  }
  if (["processing", "shipped", "delivered"].includes(status)) {
    order.paymentStatus = "paid";
    if (!order.paidAt) order.paidAt = new Date();
  }
  if (status === "cancelled") {
    order.paymentStatus = "failed";
    order.isDelivered = false;
    order.deliveredAt = null;
  }
  if (status === "delivered") {
    order.isDelivered = true;
    order.deliveredAt = new Date();
  }

  await order.save();
  order = await ensureReferralSyncedForOrder(order);
  res.json(order);
}

// Update payment status (admin only)
export async function updateOrderPaymentStatus(req, res) {
  const { paymentStatus } = req.body;
  const allowed = ["pending", "paid", "failed"];
  if (!allowed.includes(paymentStatus)) {
    res.status(400);
    throw new Error("Invalid payment status");
  }

  let order = await Order.findById(req.params.id);
  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }

  order.paymentStatus = paymentStatus;
  if (paymentStatus === "paid") {
    if (!order.paidAt) order.paidAt = new Date();
    if (order.orderStatus === "pending") {
      order.orderStatus = "processing";
    }
  }

  if (paymentStatus === "failed") {
    order.orderStatus = "cancelled";
    order.isDelivered = false;
    order.deliveredAt = null;
  }

  if (paymentStatus === "pending") {
    order.paidAt = null;
    if (order.orderStatus === "delivered") {
      order.orderStatus = "processing";
      order.isDelivered = false;
      order.deliveredAt = null;
    }
  }

  await order.save();
  order = await ensureReferralSyncedForOrder(order);
  res.json(order);
}

// Delete order permanently (admin only)
export async function deleteOrder(req, res) {
  const order = await Order.findById(req.params.id);
  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }

  const orderId = order._id;
  const proofUrl = order.paymentScreenshotUrl;

  // Remove linked referral history for this order only.
  await Referral.deleteOne({ order: orderId });

  // Release any discount code linked to this order so it can be reused.
  await DiscountCode.updateMany(
    { order: orderId },
    { $set: { used: false }, $unset: { usedAt: 1, usedBy: 1, order: 1 } }
  );

  await Order.deleteOne({ _id: orderId });
  await removePaymentProofFile(proofUrl);

  res.json({
    message: "Order deleted permanently",
    orderId,
  });
}

// Admin utility: reconcile affiliate links/referrals for existing orders
export async function resyncAffiliateReferrals(req, res) {
  const orders = await Order.find({
    $or: [
      { affiliate: { $exists: true, $ne: null } },
      { affiliateCode: { $exists: true, $ne: "" } },
      { affiliateCodeEntered: { $exists: true, $ne: "" } },
    ],
  }).sort({ createdAt: -1 });

  let scanned = 0;
  let linked = 0;
  let synced = 0;

  for (const order of orders) {
    scanned += 1;
    const beforeAffiliate = Boolean(order.affiliate);
    const updated = await ensureReferralSyncedForOrder(order);
    if (!beforeAffiliate && updated?.affiliate) linked += 1;
    if (updated?.affiliate) synced += 1;
  }

  return res.json({
    message: "Affiliate referral resync completed",
    scanned,
    linked,
    synced,
  });
}




