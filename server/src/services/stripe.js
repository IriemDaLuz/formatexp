import Stripe from "stripe";

let stripeClient = null;

export default function getStripe() {
  if (stripeClient) return stripeClient;

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY no está definida en el entorno (.env).");
  }

  stripeClient = new Stripe(key, {
    apiVersion: "2025-12-15.clover"
  });

  return stripeClient;
}
