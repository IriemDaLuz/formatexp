import express from "express";
import stripe from "../services/stripe.js";
import User from "../models/User.js";

const router = express.Router();

/**
 * Stripe exige RAW body para verificar firma:
 * express.raw({ type: "application/json" })
 */
router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const sig = req.headers["stripe-signature"];
    let event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.error(" Webhook signature verification failed:", err.message);
      return res.status(400).send("Webhook signature verification failed.");
    }

    try {
      // 1) Primer pago completado (checkout)
      if (event.type === "checkout.session.completed") {
        const session = event.data.object;

        const plan = session.metadata?.plan; // personal|pro|academia
        const userId = session.metadata?.userId;
        const email =
          session.customer_details?.email ||
          session.customer_email ||
          "";

        // Identificar usuario (preferimos userId)
        let user = null;
        if (userId) user = await User.findById(userId);
        if (!user && email) user = await User.findOne({ email: email.toLowerCase().trim() });

        if (!user) {
          console.warn("Webhook: usuario no encontrado (checkout.session.completed).");
          return res.json({ received: true });
        }

        // Guardar ids Stripe (para futuras gestiones)
        user.stripeCustomerId = session.customer || user.stripeCustomerId;
        // En checkout.session.completed a veces NO viene subscription; suele venir session.subscription
        user.stripeSubscriptionId = session.subscription || user.stripeSubscriptionId;

        // Activar plan si viene bien
        if (plan && ["personal", "pro", "academia"].includes(plan)) {
          user.plan = plan;
        }

        // Reset credits al pagar (primer pago)
        user.creditsUsed = 0;

        // Estado de suscripción (opcional)
        user.subscriptionStatus = "active";

        await user.save();

        console.log(`Plan activado para ${user.email} → ${user.plan}`);
      }

      // 2) Renovación mensual pagada (recomendado): resetea créditos al pagar cada mes
      if (event.type === "invoice.paid") {
        const invoice = event.data.object;

        const customerId = invoice.customer;
        const subscriptionId = invoice.subscription;

        const user = await User.findOne({
          $or: [
            { stripeCustomerId: customerId },
            { stripeSubscriptionId: subscriptionId }
          ]
        });

        if (user) {
          user.creditsUsed = 0;
          user.subscriptionStatus = "active";
          await user.save();
          console.log(` Créditos reseteados por invoice.paid: ${user.email}`);
        }
      }

      // 3) Cancelación de suscripción
      if (event.type === "customer.subscription.deleted") {
        const sub = event.data.object;

        const user = await User.findOne({
          $or: [
            { stripeCustomerId: sub.customer },
            { stripeSubscriptionId: sub.id }
          ]
        });

        if (user) {
          // decisión de negocio: al cancelar → volver a "personal" (o podrías bloquear)
          user.plan = "personal";
          user.subscriptionStatus = "canceled";
          await user.save();
          console.log(` Suscripción cancelada: ${user.email}`);
        }
      }

      return res.json({ received: true });
    } catch (err) {
      console.error(" Webhook handler error:", err);
      return res.status(500).json({ error: "Webhook handler error" });
    }
  }
);

export default router;
