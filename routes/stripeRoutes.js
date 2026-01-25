import express from "express";
import { createCheckoutSession } from "../controllers/stripeController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

// ✅ Protected route (requires token)
router.post("/create-checkout-session", authMiddleware, createCheckoutSession);

export default router;
