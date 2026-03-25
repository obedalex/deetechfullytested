import asyncHandler from "express-async-handler";
import Product from "../models/Product.js";
import Review from "../models/Review.js";
import { storeImageFile } from "../utils/mediaStorage.js";
import {
  rebuildProductSnapshot,
  readProductSnapshotProducts,
  findProductInSnapshotById,
} from "../utils/productSnapshot.js";

const BRANDS_BY_CATEGORY = {
  laptops: ["HP", "Dell", "Lenovo", "Apple", "Asus", "Acer", "Microsoft", "Samsung", "Toshiba", "MSI", "Other"],
  phones: ["Apple", "Samsung", "Google", "Huawei", "Xiaomi", "Oppo", "Vivo", "Tecno", "Infinix", "Nokia", "Other"],
  monitors: ["Dell", "HP", "Samsung", "LG", "Acer", "Asus", "BenQ", "ViewSonic", "Philips", "AOC", "Other"],
  accessories: ["Logitech", "Microsoft", "Apple", "Samsung", "Anker", "JBL", "Sony", "Razer", "Corsair", "HyperX", "Other"],
  storage: ["Seagate", "Western Digital", "Samsung", "Toshiba", "Kingston", "SanDisk", "Crucial", "Transcend", "Other"],
  printers: ["HP", "Canon", "Epson", "Brother", "Xerox", "Lexmark", "Ricoh", "Kyocera", "Other"],
  others: ["Generic", "Unbranded", "Other", "Multiple"],
};

const HOME_SECTION_KEYS = new Set([
  "popular",
  "best_laptops",
  "top_smartphones",
  "new_arrivals",
  "shop_by_brands",
]);

function canonicalCategory(raw) {
  const v = String(raw || "").trim().toLowerCase();
  if (v.startsWith("laptop")) return "laptops";
  if (v.startsWith("phone")) return "phones";
  if (v.startsWith("monitor")) return "monitors";
  if (v.startsWith("access")) return "accessories";
  if (v.startsWith("stor")) return "storage";
  if (v.startsWith("print")) return "printers";
  if (v.startsWith("other")) return "others";
  return v;
}

function canonicalBrandForCategory(category, rawBrand) {
  const brand = String(rawBrand || "").trim();
  const allowed = BRANDS_BY_CATEGORY[category] || [];
  return allowed.find((b) => b.toLowerCase() === brand.toLowerCase()) || brand;
}

function validateCategoryBrand(category, brand) {
  const allowedBrands = BRANDS_BY_CATEGORY[category];
  if (!allowedBrands) {
    throw new Error("Invalid product category");
  }
  if (!allowedBrands.includes(brand)) {
    throw new Error(`Invalid brand for ${category}`);
  }
}

function parseHomeSections(input) {
  if (Array.isArray(input)) {
    return [...new Set(input.map((v) => String(v || "").trim().toLowerCase()).filter((v) => HOME_SECTION_KEYS.has(v)))];
  }
  return [...new Set(
    String(input || "")
      .split(",")
      .map((v) => v.trim().toLowerCase())
      .filter((v) => HOME_SECTION_KEYS.has(v))
  )];
}

function parseImageUrls(input) {
  return String(input || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseSpecsInput(input) {
  if (input === undefined || input === null) return {};
  if (typeof input === "object" && !Array.isArray(input)) {
    const out = {};
    Object.entries(input).forEach(([key, value]) => {
      const k = String(key || "").trim();
      if (!k) return;
      out[k] = String(value || "").trim();
    });
    return out;
  }
  const raw = String(input || "").trim();
  if (!raw) return {};
  const out = {};
  raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .forEach((item) => {
      const colonIndex = item.indexOf(":");
      if (colonIndex > -1) {
        const key = item.slice(0, colonIndex).trim();
        const value = item.slice(colonIndex + 1).trim();
        if (key) out[key] = value;
      } else {
        out[item] = "";
      }
    });
  return out;
}

function uniqueImages(list = []) {
  const seen = new Set();
  const out = [];
  list.forEach((raw) => {
    const v = String(raw || "").trim();
    if (!v || seen.has(v)) return;
    seen.add(v);
    out.push(v);
  });
  return out;
}

function parseExistingImagesInput(input) {
  if (Array.isArray(input)) {
    return uniqueImages(input);
  }
  if (input === undefined || input === null) return null;
  const raw = String(input || "").trim();
  if (!raw) return [];
  return uniqueImages([raw]);
}

async function refreshProductSnapshotNonBlocking() {
  try {
    await rebuildProductSnapshot();
  } catch (error) {
    console.error("Product snapshot refresh failed:", error?.message || error);
  }
}

async function uploadProductImages(files = []) {
  const uploaded = [];
  for (const file of files) {
    const stored = await storeImageFile(file, "deetech/products");
    uploaded.push(stored.url);
  }
  return uploaded;
}

// @desc    Create new product (admin only) with images
export const createProduct = asyncHandler(async (req, res) => {
  const uploadedImages = await uploadProductImages(req.files || []);
  const galleryUrls = parseImageUrls(req.body.imageUrls);
  const incomingMainImage = String(req.body.image_url || "").trim();
  const allImages = uniqueImages([incomingMainImage, ...uploadedImages, ...galleryUrls]);
  const mainImage = incomingMainImage || allImages[0] || "";
  const featuredRaw = req.body.isFeatured;
  const isFeatured =
    featuredRaw === true ||
    featuredRaw === "true" ||
    featuredRaw === "on" ||
    featuredRaw === "1";
  const category = canonicalCategory(req.body.category);
  const brand = canonicalBrandForCategory(category, req.body.brand);
  try {
    validateCategoryBrand(category, brand);
  } catch (error) {
    res.status(400);
    throw new Error(error.message);
  }

  const product = new Product({
    name: req.body.name,
    short_description: String(req.body.short_description || "").trim(),
    description: req.body.description,
    specs: parseSpecsInput(req.body.specs),
    price: req.body.price,
    countInStock: req.body.countInStock,
    brand,
    category,
    isFeatured,
    homeSections: parseHomeSections(req.body.homeSections),
    image_url: mainImage,
    images: allImages,
  });

  const createdProduct = await product.save();
  await refreshProductSnapshotNonBlocking();
  res.status(201).json(createdProduct);
});

// @desc    Get all products
export const getProducts = asyncHandler(async (req, res) => {
  try {
    const products = await Product.find({})
      .populate({
        path: "reviews",
        populate: { path: "user", select: "name email" },
      });
    res.json(products);
  } catch (error) {
    const snapshotProducts = await readProductSnapshotProducts();
    if (snapshotProducts.length) {
      res.set("x-deetech-fallback", "snapshot");
      return res.json(snapshotProducts);
    }
    throw error;
  }
});

// @desc    Get single product
export const getProductById = asyncHandler(async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate({
      path: "reviews",
      populate: { path: "user", select: "name email" },
    });

    if (!product) {
      res.status(404);
      throw new Error("Product not found");
    }

    return res.json(product);
  } catch (error) {
    const fallbackProduct = await findProductInSnapshotById(req.params.id);
    if (fallbackProduct) {
      res.set("x-deetech-fallback", "snapshot");
      return res.json(fallbackProduct);
    }
    throw error;
  }
});

// @desc    Update product (admin only) with images
export const updateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }

  const nextCategory = req.body.category ? canonicalCategory(req.body.category) : product.category;
  const nextBrandRaw = req.body.brand || product.brand;
  const nextBrand = canonicalBrandForCategory(nextCategory, nextBrandRaw);
  try {
    validateCategoryBrand(nextCategory, nextBrand);
  } catch (error) {
    res.status(400);
    throw new Error(error.message);
  }

  product.name = req.body.name || product.name;
  if (req.body.short_description !== undefined) {
    product.short_description = String(req.body.short_description || "").trim();
  }
  product.description = req.body.description || product.description;
  if (req.body.specs !== undefined) {
    product.specs = parseSpecsInput(req.body.specs);
  }
  product.price = req.body.price ?? product.price;
  product.countInStock = req.body.countInStock ?? product.countInStock;
  product.brand = nextBrand;
  product.category = nextCategory;
  if (req.body.isFeatured !== undefined) {
    const featuredRaw = req.body.isFeatured;
    product.isFeatured =
      featuredRaw === true ||
      featuredRaw === "true" ||
      featuredRaw === "on" ||
      featuredRaw === "1";
  }
  if (req.body.homeSections !== undefined) {
    product.homeSections = parseHomeSections(req.body.homeSections);
  }

  const uploadedImages = await uploadProductImages(req.files || []);
  const galleryUrls = parseImageUrls(req.body.imageUrls);
  const requestedExistingImages = parseExistingImagesInput(req.body.existingImages);
  const currentImages = Array.isArray(product.images) ? uniqueImages(product.images) : [];
  const baseExistingImages = Array.isArray(requestedExistingImages)
    ? requestedExistingImages.filter((img) => currentImages.includes(img) || String(img) === String(product.image_url || ""))
    : currentImages;
  const incomingMainImage = req.body.image_url !== undefined ? String(req.body.image_url || "").trim() : "";
  const resolvedMainImage = incomingMainImage || String(product.image_url || "").trim() || String(product.images?.[0] || "").trim();
  const mergedImages = uniqueImages([
    resolvedMainImage,
    ...baseExistingImages,
    ...uploadedImages,
    ...galleryUrls,
  ]);

  product.image_url = resolvedMainImage || mergedImages[0] || "";
  product.images = mergedImages;

  const updatedProduct = await product.save();
  await refreshProductSnapshotNonBlocking();
  res.json(updatedProduct);
});

// @desc    Delete product (admin only)
export const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }

  await Review.deleteMany({ product: product._id });
  await product.deleteOne();
  await refreshProductSnapshotNonBlocking();

  res.json({ message: "Product removed" });
});

// @desc    Add review
export const addReview = asyncHandler(async (req, res) => {
  const { rating, title, comment, image_url } = req.body;
  const product = await Product.findById(req.params.id);

  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }

  const existingReview = await Review.findOne({
    product: product._id,
    user: req.user._id,
  });

  if (existingReview) {
    res.status(400);
    throw new Error("Product already reviewed");
  }

  const review = await Review.create({
    user: req.user._id,
    product: product._id,
    rating: Number(rating),
    title: String(title || "").trim(),
    comment,
    image_url: String(image_url || "").trim(),
  });

  product.reviews.push(review._id);
  await product.save();

  res.status(201).json(review);
});



