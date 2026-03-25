// backend/src/controllers/reviewController.js
import asyncHandler from "express-async-handler";
import Review from "../models/Review.js";
import Product from "../models/Product.js";

const reviewPopulate = [
  { path: "user", select: "name email role" },
  { path: "product", select: "name category brand" },
];

// @desc    Add a review to a product
// @route   POST /api/reviews/:productId
// @access  Private
export const addReview = asyncHandler(async (req, res) => {
  const { rating, title, comment, image_url } = req.body;
  const product = await Product.findById(req.params.productId);

  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }

  // prevent duplicate review by same user
  const existingReview = await Review.findOne({
    product: product._id,
    user: req.user._id,
  });

  if (existingReview) {
    res.status(400);
    throw new Error("You already reviewed this product");
  }

  const review = await Review.create({
    user: req.user._id,
    product: product._id,
    rating: Number(rating),
    title: String(title || "").trim(),
    comment,
    image_url: String(image_url || "").trim(),
    approved: true,
  });

  product.reviews.push(review._id);
  await product.save();

  const created = await Review.findById(review._id).populate(reviewPopulate);
  res.status(201).json(created);
});

// @desc    Update a review
// @route   PUT /api/reviews/:id
// @access  Private (owner)
export const updateReview = asyncHandler(async (req, res) => {
  const { rating, title, comment, image_url } = req.body;
  const review = await Review.findById(req.params.id);

  if (!review) {
    res.status(404);
    throw new Error("Review not found");
  }

  if (review.user.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error("Not authorized to update this review");
  }

  review.rating = rating ?? review.rating;
  review.title = title !== undefined ? String(title || "").trim() : review.title;
  review.comment = comment ?? review.comment;
  review.image_url = image_url !== undefined ? String(image_url || "").trim() : review.image_url;
  review.approved = true;
  review.moderatedAt = null;

  const updated = await review.save();
  const populated = await Review.findById(updated._id).populate(reviewPopulate);
  res.json(populated);
});

// @desc    Delete a review
// @route   DELETE /api/reviews/:id
// @access  Private (owner or admin)
export const deleteReview = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.id);

  if (!review) {
    res.status(404);
    throw new Error("Review not found");
  }

  if (
    review.user.toString() !== req.user._id.toString() &&
    req.user.role !== "admin"
  ) {
    res.status(403);
    throw new Error("Not authorized to delete this review");
  }

  await Product.updateOne(
    { _id: review.product },
    { $pull: { reviews: review._id } }
  );
  await review.deleteOne();
  res.json({ message: "Review deleted" });
});

// @desc    Get reviews for a product
// @route   GET /api/reviews/product/:productId
// @access  Public
export const getProductReviews = asyncHandler(async (req, res) => {
  const reviews = await Review.find({
    product: req.params.productId,
    approved: true,
  })
    .populate("user", "name email")
    .sort({ createdAt: -1 });

  res.json(reviews);
});

// @desc    Get current user review for a product
// @route   GET /api/reviews/my/:productId
// @access  Private
export const getMyProductReview = asyncHandler(async (req, res) => {
  const review = await Review.findOne({
    product: req.params.productId,
    user: req.user._id,
  })
    .populate("user", "name email")
    .populate("product", "name");

  res.json(review || null);
});

// @desc    Get current user reviews
// @route   GET /api/reviews/me
// @access  Private
export const getMyReviews = asyncHandler(async (req, res) => {
  const reviews = await Review.find({ user: req.user._id })
    .populate("product", "name category brand price images")
    .sort({ updatedAt: -1, createdAt: -1 });

  res.json(reviews);
});

// @desc    Admin list reviews
// @route   GET /api/reviews
// @access  Admin
export const getAllReviews = asyncHandler(async (req, res) => {
  const status = String(req.query.status || "all").toLowerCase();
  const q = String(req.query.q || "").trim();

  const filter = {};
  if (status === "approved") filter.approved = true;
  if (status === "rejected") filter.approved = false;

  const reviews = await Review.find(filter)
    .populate(reviewPopulate)
    .sort({ createdAt: -1 });

  const filtered = q
    ? reviews.filter((r) => {
        const text = [
          r.title,
          r.comment,
          r?.user?.name,
          r?.user?.email,
          r?.product?.name,
          r?.product?.category,
        ]
          .map((v) => String(v || "").toLowerCase())
          .join(" ");
        return text.includes(q.toLowerCase());
      })
    : reviews;

  res.json(filtered);
});

// @desc    Moderate review (approve/reject)
// @route   PUT /api/reviews/:id/moderate
// @access  Admin
export const moderateReview = asyncHandler(async (req, res) => {
  const { approved } = req.body;
  const review = await Review.findById(req.params.id);

  if (!review) {
    res.status(404);
    throw new Error("Review not found");
  }

  review.approved = approved;
  review.moderatedAt = new Date();
  const updated = await review.save();
  const populated = await Review.findById(updated._id).populate(reviewPopulate);
  res.json(populated);
});


