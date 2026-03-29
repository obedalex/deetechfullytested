import express from "express";
import { generateDiscounts, listDiscounts, deleteDiscount } from "../controllers/discountController.js";
import { protect, admin } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", protect, admin, listDiscounts);
router.post("/", protect, admin, generateDiscounts);
router.delete("/:id", protect, admin, deleteDiscount);

export default router;
