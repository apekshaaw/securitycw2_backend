import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";

import {
  loginLimiter,
  sendOtpLimiter,
  verifyLoginOtpLimiter,
} from "../middleware/rateLimit.js";

import {
  registerUser,
  loginUser,
  sendOtp,
  verifyOtp,
  verifyLoginOtp,

  forgotPassword,
  verifyResetOtp,
  resetPassword,

  updateProfile,
  getUserProfile,
  deleteAccount,

  verifyPassword,
  changePassword, // ✅ NEW

  addToWishlist,
  removeFromCart,
  removeFromWishlist,
  getWishlist,

  addToCart,
  updateCartItemQuantity,
  overwriteCart,
  getCart,
} from "../controllers/authController.js";

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginLimiter, loginUser);

router.post("/verify-login-otp", verifyLoginOtpLimiter, verifyLoginOtp);

router.get("/profile", authMiddleware, getUserProfile);
router.put("/profile", authMiddleware, updateProfile);

router.delete("/account", authMiddleware, deleteAccount);

router.post("/send-otp", sendOtpLimiter, sendOtp);
router.post("/verify-otp", verifyOtp);
router.post("/forgot-password", forgotPassword);
router.post("/verify-reset-otp", verifyResetOtp);
router.post("/reset-password", resetPassword);


router.post("/verify-password", authMiddleware, verifyPassword);
router.put("/change-password", authMiddleware, changePassword); 

// ======================
// Wishlist Routes
// ======================
router.post("/wishlist/add", authMiddleware, addToWishlist);
router.delete("/wishlist/:productId", authMiddleware, removeFromWishlist);
router.get("/wishlist", authMiddleware, getWishlist);

// ======================
// Cart Routes
// ======================
router.post("/cart", authMiddleware, addToCart);
router.delete("/cart", authMiddleware, removeFromCart);
router.put("/cart/update", authMiddleware, updateCartItemQuantity);
router.get("/cart", authMiddleware, getCart);
router.put("/cart/overwrite", authMiddleware, overwriteCart);

export default router;
