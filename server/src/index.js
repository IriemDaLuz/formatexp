// server/src/index.js
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";

import authRoutes from "./routes/auth.routes.js";
import generateRoutes from "./routes/generate.routes.js";
import materialsRoutes from "./routes/materials.routes.js";
import waitlistRoutes from "./routes/waitlist.routes.js";

import { startCreditsResetJob } from "./jobs/resetCredits.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// ==================
// MIDDLEWARES
// ==================
app.use(cors());
app.use(express.json({ limit: "1mb" }));

// ==================
// ROUTES
// ==================
app.get("/", (_req, res) => {
  res.json({ status: "FormatExp API OK" });
});

app.use("/api/auth", authRoutes);
app.use("/api/generate", generateRoutes);
app.use("/api/materials", materialsRoutes);
app.use("/api/waitlist", waitlistRoutes);

// ==================
// DB + SERVER START
// ==================
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("✓ Conectado a MongoDB");

    // 🔄 Job mensual de créditos
    startCreditsResetJob();

    app.listen(PORT, () => {
      console.log(`API FormatExp escuchando en http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error(" Error conectando a MongoDB:", err.message);
  });
