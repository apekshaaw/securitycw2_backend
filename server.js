import "dotenv/config"; // ✅ MUST be first (loads .env before anything else)

import app from "./app.js";
import connectDB from "./config/db.js";

const PORT = process.env.PORT || 5001;

// Optional debug (remove later)
console.log("Stripe key present?", Boolean(process.env.STRIPE_SECRET_KEY));

connectDB()
  .then(() => {
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error("DB connection failed:", err.message);
    process.exit(1);
  });
