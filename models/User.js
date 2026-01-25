import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
    },

    role: {
      type: String,
      default: 'user',
    },

    profileImage: {
      type: String,
      default: '',
    },

    mobile: {
      type: String,
      default: '',
    },

    gender: {
      type: String,
      default: '',
    },

    address: {
      type: String,
      default: '',
    },

    wishlist: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
      },
    ],

    cart: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Product',
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
          default: 1,
        },
        selectedSize: {
          type: String,
          required: true,
        },
      },
    ],

    // 🔐 SECURITY FIELDS (NEW)

    loginAttempts: {
      type: Number,
      default: 0,
    },

    lockUntil: {
      type: Date,
      default: null,
    },

    otp: {
      type: String, // hashed OTP
      default: null,
    },

    otpExpiresAt: {
      type: Date,
      default: null,
    },

    otpPurpose: {
      type: String, // "login" | "signup" | "reset"
      default: null,
    },
  },
  { timestamps: true }
);

export default mongoose.model('User', userSchema);
