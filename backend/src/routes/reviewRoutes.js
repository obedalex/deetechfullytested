// backend/src/routes/reviewRoutes.js
import express from "express";
import {
  addReview,
  updateReview,
  deleteReview,
  getProductReviews,
  getMyProductReview,
  getMyReviews,
  getAllReviews,
  moderateReview,
} from "../controllers/reviewController.js";
import { protect, admin } from "../middleware/authMiddleware.js";
import asyncHandler from "../middleware/asyncHandler.js";
import { upload } from "../middleware/uploadMiddleware.js";
import { createRateLimiter } from "../middleware/rateLimitFactory.js";
import { storeImageFile } from "../utils/mediaStorage.js";
import { validateRequest } from "../middleware/validateMiddleware.js";
import {
  addReviewSchema,
  updateReviewSchema,
  moderateReviewSchema,
} from "../validators/reviewSchemas.js";

const router = express.Router();

const reviewUploadLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { message: "Too many review image uploads. Please try again later." },
});

/**
 * @route   GET /api/reviews
 * @desc    Admin get all reviews
 * @access  Admin
 */
router.get("/", protect, admin, getAllReviews);
router.get("/me", protect, getMyReviews);

/**
 * @route   GET /api/reviews/product/:productId
 * @desc    Get all reviews for a product
 * @access  Public
 */
router.get("/product/:productId", getProductReviews);

/**
 * @route   GET /api/reviews/my/:productId
 * @desc    Get current user's review for a product
 * @access  Private
 */
router.get("/my/:productId", protect, getMyProductReview);

/**
 * @route   POST /api/reviews/upload
 * @desc    Upload review image
 * @access  Private
 */
router.post(
  "/upload",
  protect,
  reviewUploadLimiter,
  upload.single("image"),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      res.status(400);
      throw new Error("Review image is required");
    }
    const stored = await storeImageFile(req.file, "deetech/reviews");
    res.status(201).json({ imageUrl: stored.url, storage: stored.storage });
  })
);

/**
 * @route   POST /api/reviews/:productId
 * @desc    Add a new review for a product
 * @access  Private
 */
router.post(
  "/:productId",
  protect,
  validateRequest(addReviewSchema),
  addReview
);

/**
 * @route   PUT /api/reviews/:id
 * @desc    Update a review (only owner)
 * @access  Private
 *
 * @route   DELETE /api/reviews/:id
 * @desc    Delete a review (owner or admin)
 * @access  Private/Admin
 */
router
  .route("/:id")
  .put(protect, validateRequest(updateReviewSchema), updateReview)
  .delete(protect, deleteReview);

/**
 * @route   PUT /api/reviews/:id/moderate
 * @desc    Approve or reject a review
 * @access  Admin
 */
router.put(
  "/:id/moderate",
  protect,
  admin,
  validateRequest(moderateReviewSchema),
  moderateReview
);

export default router;
