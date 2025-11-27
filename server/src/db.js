import mongoose from "mongoose";
import { config } from "./config.js";

export async function connectDB() {
  try {
    await mongoose.connect(config.mongodbUri);
    console.log("✅ Conectado a MongoDB");
  } catch (err) {
    console.error(" No se pudo conectar a MongoDB. Continuamos sin base de datos:");
    console.error("   ", err.message);
  }
}
