import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import nodemailer from "nodemailer";
import User from "../models/User.js";
import Product from "../models/Product.js"; // (kept as-is, even if unused)
import { logAction } from "../utils/auditLogger.js";


// ======================
// ✅ ADMIN CONFIG (NEW)
// ======================
const ADMIN_EMAILS = new Set([
  "apeksha.wagle2017@gmail.com",
  // add more admin emails here if needed
]);

const normalizeEmail = (email = "") => email.trim().toLowerCase();

// ======================
// OTP (in-memory store)
// ======================
const otpStore = new Map();
// email -> { otpHash, expiresAt, verified, purpose }

// Generate 6-digit OTP
const generateOtp = () => String(Math.floor(100000 + Math.random() * 900000));

// Hash OTP
const hashOtp = (otp) => crypto.createHash("sha256").update(otp).digest("hex");

// Email sender
const sendOtpEmail = async (toEmail, otp) => {
  const hasSmtp =
    process.env.SMTP_HOST &&
    process.env.SMTP_PORT &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS;

  if (!hasSmtp) {
    console.log(`✅ OTP for ${toEmail}: ${otp}`);
    return;
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: toEmail,
    subject: "Your RentIt OTP Code",
    text: `Your OTP is: ${otp}. It expires in 5 minutes.`,
  });
};

// ======================
// SEND OTP (SIGNUP)
// ======================
export const sendOtp = async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    if (!email) return res.status(400).json({ message: "Email is required" });

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: "User already exists" });
    }

    const otp = generateOtp();
    otpStore.set(email, {
      otpHash: hashOtp(otp),
      expiresAt: Date.now() + 5 * 60 * 1000,
      verified: false,
      purpose: "signup",
    });

    await sendOtpEmail(email, otp);
    return res.status(200).json({ message: "OTP sent to email" });
  } catch (error) {
    console.error("Send OTP Error:", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};

// ======================
// VERIFY OTP (SIGNUP)
// ======================
export const verifyOtp = async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const otp = String(req.body?.otp || "").trim();

    const entry = otpStore.get(email);
    if (!entry || entry.purpose !== "signup") {
      return res.status(400).json({ message: "OTP not found" });
    }

    if (Date.now() > entry.expiresAt) {
      otpStore.delete(email);
      return res.status(400).json({ message: "OTP expired" });
    }

    if (hashOtp(otp) !== entry.otpHash) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    otpStore.set(email, { ...entry, verified: true });
    return res.status(200).json({ message: "OTP verified successfully" });
  } catch (error) {
    return res.status(500).json({ message: "Server error" });
  }
};

// ======================
// Register User (UPDATED: admin email => admin role)
// ======================
export const registerUser = async (req, res) => {
  try {
    const name = String(req.body?.name || "").trim();
    const email = normalizeEmail(req.body?.email);
    const password = String(req.body?.password || "");

    const entry = otpStore.get(email);
    if (!entry || !entry.verified || entry.purpose !== "signup") {
      return res
        .status(403)
        .json({ message: "Please verify OTP before registering" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: ADMIN_EMAILS.has(email) ? "admin" : "user",
       // ✅ NEW
    });

    req.user = user;
    await logAction(req, "REGISTER_SUCCESS");


    otpStore.delete(email);

    return res.status(201).json({
      message: "Registered successfully",
      user: { id: user._id, email: user.email, role: user.role },
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error" });
  }
};

// ======================
// Login User (STEP 1 → PASSWORD + LOCK + OTP)
// ======================
export const loginUser = async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const password = String(req.body?.password || "");

    const user = await User.findOne({ email });
    if (!user) {
      await logAction(req, "LOGIN_FAILED", { email });
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // 🔒 Account locked check
    if (user.lockUntil && user.lockUntil > Date.now()) {
  await logAction(req, "LOGIN_BLOCKED_LOCKED", { email, lockUntil: user.lockUntil });
  return res.status(403).json({
    message: "Account locked. Try again later.",
  });
}

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      user.loginAttempts += 1;

      if (user.loginAttempts >= 5) {
        user.lockUntil = Date.now() + 10 * 60 * 1000;
        await user.save();
        await logAction(req, "LOGIN_LOCKED", { email, attempts: user.loginAttempts });


        return res.status(403).json({
          message: "Too many failed attempts. Account locked for 10 minutes.",
        });
      }

      await user.save();
      await logAction(req, "LOGIN_FAILED", { email, attempts: user.loginAttempts });
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // ✅ Password correct → reset lock
    user.loginAttempts = 0;
    user.lockUntil = null;
    await user.save();

    // ✅ Send login OTP
    const otp = generateOtp();
    otpStore.set(email, {
      otpHash: hashOtp(otp),
      expiresAt: Date.now() + 5 * 60 * 1000,
      purpose: "login",
    });

    await sendOtpEmail(email, otp);
    await logAction(req, "LOGIN_PASSWORD_OK_OTP_SENT", { email });

    return res.status(200).json({
      message: "OTP sent to your email",
      otpRequired: true,
    });
  } catch (error) {
    console.error("Login Error:", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};

// ======================
// VERIFY LOGIN OTP (STEP 2 → JWT)
// ======================
export const verifyLoginOtp = async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const otp = String(req.body?.otp || "").trim();

    const entry = otpStore.get(email);
    if (!entry || entry.purpose !== "login") {
      return res.status(400).json({ message: "OTP not found" });
    }

    if (Date.now() > entry.expiresAt) {
      otpStore.delete(email);
      return res.status(400).json({ message: "OTP expired" });
    }

    if (hashOtp(otp) !== entry.otpHash) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    // ✅ NEW: enforce admin role forever for admin emails
    if (ADMIN_EMAILS.has(user.email) && user.role !== "admin") {
      user.role = "admin";
      await user.save();
    }

    otpStore.delete(email);
    req.user = user;
    await logAction(req, "LOGIN_SUCCESS", { email: user.email });

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        wishlist: user.wishlist || [],
        cart: user.cart || [],
      },
    });
  } catch (error) {
    console.error("Verify Login OTP Error:", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};

// ======================
// VERIFY PASSWORD (FOR SENSITIVE ACTIONS)
// ======================
export const verifyPassword = async (req, res) => {
  try {
    const userId = req.userId; // comes from auth middleware
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ message: "Password is required" });
    }

    const user = await User.findById(userId).select("+password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ message: "Incorrect password" });
    }

    return res.status(200).json({ message: "Password verified" });
  } catch (error) {
    console.error("Verify Password Error:", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};


// ======================
// FORGOT PASSWORD: SEND OTP
// ======================
export const forgotPassword = async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    if (!email) return res.status(400).json({ message: "Email is required" });

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const otp = generateOtp();
    otpStore.set(email, {
      otpHash: hashOtp(otp),
      expiresAt: Date.now() + 5 * 60 * 1000,
      verified: false,
      purpose: "reset",
    });

    await sendOtpEmail(email, otp);
    await logAction(req, "FORGOT_PASSWORD_OTP_SENT", { email });
    return res.status(200).json({ message: "OTP sent to email" });
  } catch (error) {
    console.error("Forgot Password Error:", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};

// ======================
// FORGOT PASSWORD: VERIFY OTP
// ======================
export const verifyResetOtp = async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const otp = String(req.body?.otp || "").trim();

    const entry = otpStore.get(email);
    if (!entry || entry.purpose !== "reset") {
      return res.status(400).json({ message: "OTP not found" });
    }

    if (Date.now() > entry.expiresAt) {
      otpStore.delete(email);
      return res.status(400).json({ message: "OTP expired" });
    }

    if (hashOtp(otp) !== entry.otpHash) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    otpStore.set(email, { ...entry, verified: true });
    return res.status(200).json({ message: "OTP verified successfully" });
  } catch (error) {
    console.error("Verify Reset OTP Error:", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};

// ======================
// RESET PASSWORD (OTP REQUIRED)
// ======================
export const resetPassword = async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const otp = String(req.body?.otp || "").trim();
    const newPassword = String(req.body?.newPassword || "");

    if (!email || !otp || !newPassword) {
      return res
        .status(400)
        .json({ message: "Email, OTP and new password are required" });
    }

    const entry = otpStore.get(email);
    if (!entry || entry.purpose !== "reset") {
      return res.status(400).json({ message: "OTP not found" });
    }

    if (Date.now() > entry.expiresAt) {
      otpStore.delete(email);
      return res.status(400).json({ message: "OTP expired" });
    }

    if (!entry.verified && hashOtp(otp) !== entry.otpHash) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    otpStore.delete(email);

    return res.status(200).json({ message: "Password reset successful" });
  } catch (error) {
    console.error("Reset Password Error:", error.message);
    return res.status(500).json({ message: "Server error" });
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
    if (!user) return res.status(404).json({ message: "User not found" });

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
    req.user = user;
    await logAction(req, "PROFILE_UPDATE");


    return res.status(200).json({
      message: "Profile updated",
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      profileImage: user.profileImage || "",
      mobile: user.mobile || "",
      gender: user.gender || "",
      address: user.address || "",
      wishlist: user.wishlist || [],
      cart: user.cart || [],
    });
  } catch (error) {
    console.error("Update Profile Error:", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};

export const deleteAccount = async (req, res) => {
  try {
    const userId = req.userId;

    const user = await User.findById(userId);
    if (user) {
      req.user = user;
      await logAction(req, "ACCOUNT_DELETE");
    }

    await User.findByIdAndDelete(userId);

    return res.status(200).json({ message: "Account deleted successfully" });
  } catch (error) {
    console.error("Delete Account Error:", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};


// ======================
// CHANGE PASSWORD (NEW)
// ======================
export const changePassword = async (req, res) => {
  try {
    const userId = req.userId; // from authMiddleware
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        message: "Current password and new password are required",
      });
    }

    if (String(newPassword).length < 6) {
      return res.status(400).json({
        message: "New password must be at least 6 characters",
      });
    }

    const user = await User.findById(userId).select("+password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isMatch = await bcrypt.compare(String(currentPassword), user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Current password is incorrect" });
    }

    user.password = await bcrypt.hash(String(newPassword), 10);
    await user.save();
    req.user = user;
    await logAction(req, "PASSWORD_CHANGE");


    return res.status(200).json({ message: "Password changed successfully" });
  } catch (error) {
    console.error("Change Password Error:", error.message);
    return res.status(500).json({ message: "Server error" });
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
      return res.status(400).json({ message: "Product ID is required" });
    }

    const user = await User.findById(userId);

    const alreadyFavorited = user.wishlist.some(
      (id) => id.toString() === productId.toString()
    );

    if (!alreadyFavorited) {
      user.wishlist.push(productId);
      await user.save();
    }

    return res
      .status(200)
      .json({ message: "Added to wishlist", wishlist: user.wishlist });
  } catch (error) {
    console.error("Add Wishlist Error:", error.message);
    return res.status(500).json({ message: "Server error" });
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

    return res.status(200).json({
      message: "Removed from wishlist",
      wishlist: user.wishlist,
    });
  } catch (error) {
    console.error("Remove Wishlist Error:", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};

export const getWishlist = async (req, res) => {
  try {
    const userId = req.userId;
    const user = await User.findById(userId).populate("wishlist");
    return res.status(200).json({ wishlist: user.wishlist });
  } catch (error) {
    console.error("Get Wishlist Error:", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};

// ======================
// Cart
// ======================
export const getCart = async (req, res) => {
  try {
    const user = await User.findById(req.userId).populate("cart.product");
    return res.status(200).json({ cart: user.cart || [] });
  } catch (error) {
    console.error("Get Cart Error:", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};

export const addToCart = async (req, res) => {
  try {
    const userId = req.userId;
    const { product, quantity = 1, selectedSize } = req.body;

    if (!product || !selectedSize) {
      return res
        .status(400)
        .json({ message: "Product ID and selected size are required" });
    }

    const user = await User.findById(userId);
    const existingIndex = user.cart.findIndex(
      (item) =>
        item.product.toString() === product && item.selectedSize === selectedSize
    );

    if (existingIndex !== -1) {
      user.cart[existingIndex].quantity += quantity;
    } else {
      user.cart.push({ product, quantity, selectedSize });
    }

    user.markModified("cart");
    await user.save();

    return res
      .status(200)
      .json({ message: "Item added to cart", cart: user.cart });
  } catch (error) {
    console.error("Add to Cart Error:", error.message);
    return res.status(500).json({ message: "Server error" });
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

    user.markModified("cart");
    await user.save();

    return res
      .status(200)
      .json({ message: "Item removed from cart", cart: user.cart });
  } catch (error) {
    console.error("Remove from Cart Error:", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};

export const updateCartItemQuantity = async (req, res) => {
  try {
    const userId = req.userId;
    const { product, selectedSize, quantity } = req.body;

    const user = await User.findById(userId);
    const item = user.cart.find(
      (item) =>
        item.product.toString() === product && item.selectedSize === selectedSize
    );

    if (item) {
      item.quantity = quantity;
    }

    user.markModified("cart");
    await user.save();

    return res
      .status(200)
      .json({ message: "Quantity updated", cart: user.cart });
  } catch (error) {
    console.error("Update Cart Quantity Error:", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};

export const overwriteCart = async (req, res) => {
  try {
    const userId = req.userId;
    const { cart } = req.body;

    if (!Array.isArray(cart)) {
      return res.status(400).json({ message: "Cart must be an array" });
    }

    const user = await User.findByIdAndUpdate(userId, { cart }, { new: true });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({ message: "Cart overwritten", cart: user.cart });
  } catch (error) {
    console.error("Overwrite Cart Error:", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};

export const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    return res.status(200).json({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      profileImage: user.profileImage || "",
      mobile: user.mobile || "",
      gender: user.gender || "",
      address: user.address || "",
    });
  } catch (error) {
    console.error("Get Profile Error:", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};
