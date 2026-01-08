import express from "express";
import stripe from "../services/stripe.js";
import { authRequired } from "../middleware/auth.js";

const router = express.Router();

const PRICE_MAP = {
  personal: process.env.STRIPE_PRICE_PERSONAL,
  pro: process.env.STRIPE_PRICE_PRO,
  academia: process.env.STRIPE_PRICE_ACADEMIA
};

function getAppBaseUrl(req) {
  // Preferimos ENV. Si no existe, intentamos construir desde request.
  const envUrl = process.env.APP_BASE_URL;
  if (envUrl) return envUrl.replace(/\/+$/, "");
  const proto = req.headers["x-forwarded-proto"] || "http";
  const host = req.headers.host;
  return `${proto}://${host}`;
}

router.post("/checkout", authRequired, async (req, res) => {
  try {
    const { plan } = req.body || {};
    if (!plan || !PRICE_MAP[plan]) {
      return res.status(400).json({ error: "Plan inválido. Usa: personal | pro | academia" });
    }

    const priceId = PRICE_MAP[plan];
    const baseUrl = getAppBaseUrl(req);

    // Creamos checkout para suscripción
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],

      // Asociamos por email (simple para MVP)
      customer_email: req.user.email,

      // IMPORTANTE: metadata para saber el plan en el webhook
      metadata: {
        plan,
        userId: String(req.user._id)
      },

      success_url: `${baseUrl}/app.html?payment=success&plan=${encodeURIComponent(plan)}`,
      cancel_url: `${baseUrl}/app.html?payment=cancel`
    });

    return res.json({ url: session.url });
  } catch (err) {
    console.error("Stripe checkout error:", err);
    return res.status(500).json({ error: "Error iniciando pago" });
  }
});

export default router;
