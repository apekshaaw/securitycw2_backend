import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Product from '../models/Product.js';

// ======================
// Register User
// ======================

export const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: email === 'admin@gmail.com' ? 'admin' : 'user',
    });

    res.status(201).json({
      message: 'Registered successfully',
      user: { id: user._id, email: user.email, role: user.role },
    });
  } catch (error) {
    console.error('Registration Error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// ======================
// Login User
// ======================

export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = jwt.sign(
  { id: user._id, role: user.role },
  process.env.JWT_SECRET,
  { expiresIn: '7d' }
);

    res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        profileImage: user.profileImage || '',
        mobile: user.mobile || '',
        gender: user.gender || '',
        address: user.address || '',
        wishlist: user.wishlist || [],
        cart: user.cart || [],
      },
    });
  } catch (error) {
    console.error('Login Error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// ======================
// Profile Update / Delete
// ======================

export const updateProfile = async (req, res) => {
  try {
    const userId = req.userId;
    const { name, password, profileImage, mobile, gender, address } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (name) user.name = name;
    if (profileImage) user.profileImage = profileImage;
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      user.password = hashedPassword;
    }
    if (mobile) user.mobile = mobile;
    if (gender) user.gender = gender;
    if (address) user.address = address;

    await user.save();

    res.status(200).json({
      message: 'Profile updated',
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      profileImage: user.profileImage || '',
      mobile: user.mobile || '',
      gender: user.gender || '',
      address: user.address || '',
      wishlist: user.wishlist || [],
      cart: user.cart || [],
    });
  } catch (error) {
    console.error('Update Profile Error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

export const deleteAccount = async (req, res) => {
  try {
    const userId = req.userId;
    await User.findByIdAndDelete(userId);
    res.status(200).json({ message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Delete Account Error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};


// ======================
// Wishlist
// ======================

export const addToWishlist = async (req, res) => {
  try {
    const userId = req.userId;
    const { productId } = req.body;

    if (!productId) {
      return res.status(400).json({ message: 'Product ID is required' });
    }

    const user = await User.findById(userId);

    const alreadyFavorited = user.wishlist.some(
      (id) => id.toString() === productId.toString()
    );

    if (!alreadyFavorited) {
      user.wishlist.push(productId);
      await user.save();
    }

    res.status(200).json({ message: 'Added to wishlist', wishlist: user.wishlist });
  } catch (error) {
    console.error('Add Wishlist Error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};


export const removeFromWishlist = async (req, res) => {
  try {
    const userId = req.userId;
    const { productId } = req.params;

    const user = await User.findById(userId);
    user.wishlist = user.wishlist.filter(
      (id) => id.toString() !== productId.toString()
    );

    await user.save();

    res.status(200).json({
      message: 'Removed from wishlist',
      wishlist: user.wishlist,
    });
  } catch (error) {
    console.error('Remove Wishlist Error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getWishlist = async (req, res) => {
  try {
    const userId = req.userId;
    const user = await User.findById(userId).populate('wishlist');
    res.status(200).json({ wishlist: user.wishlist });
  } catch (error) {
    console.error('Get Wishlist Error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// ======================
// Cart
// ======================

export const getCart = async (req, res) => {
  try {
    const user = await User.findById(req.userId).populate('cart.product');
    res.status(200).json({ cart: user.cart || [] });
  } catch (error) {
    console.error('Get Cart Error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

export const addToCart = async (req, res) => {
  try {
    const userId = req.userId;
    const { product, quantity = 1, selectedSize } = req.body;

    if (!product || !selectedSize) {
      return res.status(400).json({ message: 'Product ID and selected size are required' });
    }

    const user = await User.findById(userId);
    const existingIndex = user.cart.findIndex(
      (item) =>
        item.product.toString() === product &&
        item.selectedSize === selectedSize
    );

    if (existingIndex !== -1) {
      user.cart[existingIndex].quantity += quantity;
    } else {
      user.cart.push({ product, quantity, selectedSize });
    }

    user.markModified('cart');
    await user.save();

    res.status(200).json({ message: 'Item added to cart', cart: user.cart });
  } catch (error) {
    console.error('Add to Cart Error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

export const removeFromCart = async (req, res) => {
  try {
    const userId = req.userId;
    const { product, selectedSize } = req.body;

    const user = await User.findById(userId);
    user.cart = user.cart.filter(
      (item) =>
        !(
          item.product.toString() === product &&
          item.selectedSize === selectedSize
        )
    );

    user.markModified('cart');
    await user.save();
    res.status(200).json({ message: 'Item removed from cart', cart: user.cart });
  } catch (error) {
    console.error('Remove from Cart Error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateCartItemQuantity = async (req, res) => {
  try {
    const userId = req.userId;
    const { product, selectedSize, quantity } = req.body;

    const user = await User.findById(userId);
    const item = user.cart.find(
      (item) =>
        item.product.toString() === product &&
        item.selectedSize === selectedSize
    );

    if (item) {
      item.quantity = quantity;
    }

    user.markModified('cart');
    await user.save();
    res.status(200).json({ message: 'Quantity updated', cart: user.cart });
  } catch (error) {
    console.error('Update Cart Quantity Error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

export const overwriteCart = async (req, res) => {
  try {
    const userId = req.userId;
    const { cart } = req.body;

    if (!Array.isArray(cart)) {
      return res.status(400).json({ message: 'Cart must be an array' });
    }

    // Use atomic update instead of loading + saving
    const user = await User.findByIdAndUpdate(
      userId,
      { cart },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({ message: 'Cart overwritten', cart: user.cart });
  } catch (error) {
    console.error('Overwrite Cart Error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};


export const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    res.status(200).json({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      profileImage: user.profileImage || '',
      mobile: user.mobile || '',
      gender: user.gender || '',
      address: user.address || '',
    });
  } catch (error) {
    console.error('Get Profile Error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

