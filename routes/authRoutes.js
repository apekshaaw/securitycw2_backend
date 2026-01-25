import express from 'express';
import {
  registerUser,
  loginUser,
  updateProfile,
  deleteAccount,
  addToWishlist,
  removeFromWishlist,
  getWishlist,
  addToCart,
  removeFromCart,
  getUserProfile,
  updateCartItemQuantity,
  overwriteCart,
  getCart,
} from '../controllers/authController.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

// ======================
// Auth Routes
// ======================

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/profile', authMiddleware, getUserProfile);
router.put('/profile', authMiddleware, updateProfile);
router.delete('/account', authMiddleware, deleteAccount);

// ======================
// Wishlist Routes
// ======================

router.post('/wishlist/add', authMiddleware, addToWishlist);
router.delete('/wishlist/:productId', authMiddleware, removeFromWishlist);
router.get('/wishlist', authMiddleware, getWishlist);

// ======================
// Cart Routes
// ======================

router.post('/cart', authMiddleware, addToCart);
router.delete('/cart', authMiddleware, removeFromCart);
router.put('/cart/update', authMiddleware, updateCartItemQuantity);
router.get('/cart', authMiddleware, getCart);
router.put('/cart/overwrite', authMiddleware, overwriteCart);

export default router;
