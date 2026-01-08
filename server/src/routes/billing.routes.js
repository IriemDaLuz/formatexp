// server/src/routes/billing.routes.js
import express from "express";
import getStripe from "../services/stripe.js";
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
    const priceId = PRICE_MAP[plan];

    if (!plan || !priceId) {
      return res
        .status(400)
        .json({ error: "Plan inválido. Usa: personal | pro | academia" });
    }

    // Importante: inicializamos Stripe aquí (no en el import del módulo)
    const stripe = getStripe();

    const baseUrl = getAppBaseUrl(req);

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],

      // Asociamos por email (simple para MVP)
      customer_email: req.user.email,

      // Metadata para el webhook
      metadata: {
        plan,
        userId: String(req.user._id)
      },

      success_url: `${baseUrl}/app.html?payment=success&plan=${encodeURIComponent(
        plan
      )}`,
      cancel_url: `${baseUrl}/app.html?payment=cancel`
    });

    return res.json({ url: session.url });
  } catch (err) {
    console.error("Stripe checkout error:", err);
    return res.status(500).json({ error: err?.message || "Error iniciando pago" });
  }
});

export default router;
