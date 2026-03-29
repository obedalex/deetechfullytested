import asyncHandler from "express-async-handler";
import DiscountCode from "../models/DiscountCode.js";

function generateCode(length = 6) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < length; i += 1) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

// @desc    Validate discount code (public)
// @route   POST /api/discounts/validate
// @access  Public
export const validateDiscount = asyncHandler(async (req, res) => {
  const code = String(req.body.code || "").trim().toUpperCase();
  if (!code) {
    res.status(400);
    throw new Error("Discount code is required");
  }

  const doc = await DiscountCode.findOne({ code, used: false });
  if (!doc) {
    res.status(404);
    throw new Error("Invalid or used discount code");
  }

  res.json({ code: doc.code, percent: doc.percent });
});

// @desc    List discount codes (admin)
// @route   GET /api/admin/discounts
// @access  Admin
export const listDiscounts = asyncHandler(async (req, res) => {
  const discounts = await DiscountCode.find().sort({ createdAt: -1 }).limit(500);
  res.json(discounts);
});

// @desc    Generate discount codes (admin)
// @route   POST /api/admin/discounts
// @access  Admin
export const generateDiscounts = asyncHandler(async (req, res) => {
  const percent = Number(req.body.percent);
  const count = Math.min(Number(req.body.count || 1), 50);

  if (!percent || percent < 2 || percent > 10) {
    res.status(400);
    throw new Error("Percent must be between 2 and 10");
  }

  const created = [];
  for (let i = 0; i < count; i += 1) {
    let code = generateCode(6);
    // Ensure uniqueness by retrying
    // eslint-disable-next-line no-await-in-loop
    while (await DiscountCode.findOne({ code })) {
      code = generateCode(6);
    }
    // eslint-disable-next-line no-await-in-loop
    const doc = await DiscountCode.create({
      code,
      percent,
      createdBy: req.user?._id,
    });
    created.push(doc);
  }

  res.status(201).json({ count: created.length, codes: created.map((d) => d.code) });
});

// @desc    Delete a discount code (admin)
// @route   DELETE /api/admin/discounts/:id
// @access  Admin
export const deleteDiscount = asyncHandler(async (req, res) => {
  const discountId = String(req.params.id || "").trim();
  if (!discountId) {
    res.status(400);
    throw new Error("Discount id is required");
  }

  const doc = await DiscountCode.findById(discountId);
  if (!doc) {
    res.status(404);
    throw new Error("Discount code not found");
  }

  await DiscountCode.deleteOne({ _id: doc._id });
  res.json({ message: "Discount code deleted", id: String(doc._id), code: doc.code });
});
