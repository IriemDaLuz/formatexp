import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { connectDB } from "./db.js";
import { config } from "./config.js";
import { authRouter } from "./routes/auth.routes.js";
import { waitlistRouter } from "./routes/waitlist.routes.js";
import { materialsRouter } from "./routes/materials.routes.js";
import { errorHandler } from "./middleware/errorHandler.js";

const app = express();

// Middlewares globales
app.use(helmet());
app.use(cors({
  origin: [
    "http://localhost:4173",
    "https://https://formatexpapp.netlify.app/"
  ],
  credentials: true
}));

app.use(express.json());
app.use(morgan("dev"));

// Rutas API
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use("/api/auth", authRouter);
app.use("/api/waitlist", waitlistRouter);
app.use("/api/materials", materialsRouter);

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
    console.log(` API FormatExp escuchando en http://localhost:${config.port}`);
  });
}

start().catch((err) => {
  console.error("Error al iniciar el servidor:", err);
  process.exit(1);
});
