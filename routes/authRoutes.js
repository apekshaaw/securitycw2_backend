import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";

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
  removeFromWishlist,
  getWishlist,

  addToCart,
  removeFromCart,
  updateCartItemQuantity,
  overwriteCart,
  getCart,
} from "../controllers/authController.js";

const router = express.Router();

// ======================
// Auth Routes
// ======================
router.post("/register", registerUser);
router.post("/login", loginUser);

// ✅ OTP login step
router.post("/verify-login-otp", verifyLoginOtp);

// ✅ profile
router.get("/profile", authMiddleware, getUserProfile);
router.put("/profile", authMiddleware, updateProfile);

// ✅ delete account
router.delete("/account", authMiddleware, deleteAccount);

// ✅ signup + reset OTP
router.post("/send-otp", sendOtp);
router.post("/verify-otp", verifyOtp);
router.post("/forgot-password", forgotPassword);
router.post("/verify-reset-otp", verifyResetOtp);
router.post("/reset-password", resetPassword);

// ✅ sensitive verification / password
router.post("/verify-password", authMiddleware, verifyPassword);
router.put("/change-password", authMiddleware, changePassword); // ✅ NEW

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
