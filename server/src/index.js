// server/src/index.js
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";

import authRoutes from "./routes/auth.routes.js";
import generateRoutes from "./routes/generate.routes.js";
import materialsRoutes from "./routes/materials.routes.js";
import waitlistRoutes from "./routes/waitlist.routes.js";

import billingRoutes from "./routes/billing.routes.js";
import stripeWebhookRoutes from "./routes/stripe.webhook.routes.js";

import { startCreditsResetJob } from "./jobs/resetCredits.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

/**
 * CORS seguro (mínimo):
 * - Permite localhost en dev
 * - Permite dominios permitidos por env: CORS_ORIGIN="https://app.netlify.app,https://otro.com"
 * - Si CORS_ORIGIN="*" -> permite todos (NO recomendado en prod)
 */
function parseCorsOrigins(value) {
  if (!value) return [];
  if (value.trim() === "*") return ["*"];
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

const allowedOrigins = parseCorsOrigins(process.env.CORS_ORIGIN);

const corsOptions = {
  origin(origin, callback) {
    // Permitir llamadas server-to-server / Postman / curl sin origin
    if (!origin) return callback(null, true);

    // Modo wildcard
    if (allowedOrigins.includes("*")) return callback(null, true);

    // Permitir localhost en dev
    const isLocalhost =
      origin.startsWith("http://localhost:") ||
      origin.startsWith("http://127.0.0.1:") ||
      origin.startsWith("http://0.0.0.0:");

    if (isLocalhost) return callback(null, true);

    // Allowlist explícita por env
    if (allowedOrigins.includes(origin)) return callback(null, true);

    return callback(new Error(`CORS bloqueado para origin: ${origin}`));
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: false,
  maxAge: 86400
};

// CORS middleware (misma config para todo)
app.use(cors(corsOptions));
// Preflight consistente
app.options("*", cors(corsOptions));

//  1) Stripe webhook ANTES de express.json()
app.use("/api/stripe", stripeWebhookRoutes);

//  2) JSON para el resto
app.use(express.json({ limit: "1mb" }));

app.get("/", (_req, res) => {
  res.json({ status: "FormatExp API OK" });
});

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    service: "FormatExp API",
    env: process.env.NODE_ENV || "unknown",
    time: new Date().toISOString()
  });
});


// Rutas
app.use("/api/auth", authRoutes);
app.use("/api/generate", generateRoutes);
app.use("/api/materials", materialsRoutes);
app.use("/api/waitlist", waitlistRoutes);
app.use("/api/billing", billingRoutes);

// Error handler mínimo para CORS (y otros)
app.use((err, _req, res, _next) => {
  if (String(err?.message || "").startsWith("CORS bloqueado")) {
    return res.status(403).json({ error: err.message });
  }
  console.error("API ERROR:", err);
  return res.status(500).json({ error: "Error interno del servidor." });
});

// DB + start
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("Conectado a MongoDB");

    startCreditsResetJob();

    app.listen(PORT, () => {
      console.log(`API FormatExp escuchando en http://localhost:${PORT}`);
      if (allowedOrigins.length) {
        console.log("CORS allowlist:", allowedOrigins);
      } else {
        console.log(
          "CORS allowlist vacía (solo localhost + no-origin). Define CORS_ORIGIN en prod."
        );
      }
    });
  })
  .catch((err) => {
    console.error("Error conectando a MongoDB:", err.message);
  });
app.use((req, res) => {
  res.status(404).json({ error: "Ruta no encontrada" });
});
