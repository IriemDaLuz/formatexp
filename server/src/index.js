import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

import { connectDB } from "./db.js";
import { config } from "./config.js";

import generateRoutes from "./routes/generate.routes.js";
import { authRouter } from "./routes/auth.routes.js";
import { waitlistRouter } from "./routes/waitlist.routes.js";
import { materialsRouter } from "./routes/materials.routes.js";

import { errorHandler } from "./middleware/errorHandler.js";

const app = express();

/**
 * ✅ CORS robusto:
 * - Permite localhost
 * - Permite Netlify (tu dominio)
 * - Permite requests sin Origin (curl/postman/health checks)
 */
const ALLOWED_ORIGINS = new Set([
  "http://localhost:4173",
  "http://localhost:5173",
  "http://localhost:3000",
  "https://formatexpapp.netlify.app"
  // Si usas dominio con www, añade:
  // "https://www.formatexpapp.netlify.app",
]);

app.use(helmet());

// Preflight y CORS
app.use(
  cors({
    origin: (origin, callback) => {
      // Permitir requests sin origin (curl, health checks)
      if (!origin) return callback(null, true);

      if (ALLOWED_ORIGINS.has(origin)) return callback(null, true);

      return callback(new Error(`CORS bloqueado para origin: ${origin}`), false);
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: false // ✅ para tu caso (JWT Bearer), no cookies
  })
);

//  Asegura que preflight responde siempre
app.options("*", cors());

// Si vas a pegar textos largos (PDF/pegar apuntes) sube el limit:
app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));

// Rutas API
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use("/api/auth", authRouter);
app.use("/api/waitlist", waitlistRouter);
app.use("/api/materials", materialsRouter);
app.use("/api/generate", generateRoutes);

// 404
app.use((req, res) => {
  res.status(404).json({ error: "Ruta no encontrada" });
});

// Error handler
app.use(errorHandler);

// Arranque
async function start() {
  await connectDB();
  app.listen(config.port, () => {
    console.log(`API FormatExp escuchando en http://localhost:${config.port}`);
  });
}

start().catch((err) => {
  console.error("Error al iniciar el servidor:", err);
  process.exit(1);
});
