import Stripe from "stripe";

let stripeClient = null;

const getStripe = () => {
  if (!stripeClient) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY missing in .env");
    stripeClient = new Stripe(key);
  }
  return stripeClient;
};

export const createCheckoutSession = async (req, res) => {
  try {
    const { cartItems, delivery } = req.body;

    // comes from authMiddleware
    const userId = req.userId || "guest";

    if (!Array.isArray(cartItems) || cartItems.length === 0) {
      return res.status(400).json({ message: "Cart is empty" });
    }

    // ✅ Delivery validation
    const fullName = delivery?.name?.trim();
    const contact = delivery?.contact?.trim();
    const location = delivery?.location?.trim();

    if (!fullName || !contact || !location) {
      return res.status(400).json({ message: "Delivery details are required" });
    }

    // ✅ Build line items
    const lineItems = cartItems.map((item) => {
      const name = String(item.name || "Item");
      const unitAmount = Math.round((Number(item.price) || 0) * 100);
      const quantity = Number(item.quantity) || 1;

      return {
        price_data: {
          currency: "usd",
          product_data: { name },
          unit_amount: unitAmount,
        },
        quantity,
      };
    });

    const stripe = getStripe();

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: lineItems,
      success_url: "http://localhost:5173/dashboard?payment=success",
      cancel_url: "http://localhost:5173/dashboard?payment=cancel",
      metadata: {
        userId,
        deliveryName: fullName,
        deliveryContact: contact,
        deliveryLocation: location,
      },
    });

    return res.json({ url: session.url });
  } catch (err) {
    console.error("Stripe checkout error:", err.message);
    return res.status(500).json({ message: "Stripe checkout failed" });
  }
};
