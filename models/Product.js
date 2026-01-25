import mongoose from 'mongoose';

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    category: String,
    sizes: [String], 
    price: {
      type: Number,
      required: true,
    },
    image: String,
    availability: {
      type: Boolean,
      default: true,
    },
     description: {
      type: String,
      required: false,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

const Product = mongoose.model('Product', productSchema);
export default Product;
