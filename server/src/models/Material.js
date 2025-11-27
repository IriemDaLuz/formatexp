import mongoose from "mongoose";

const materialSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ["test", "resumen", "guia", "presentacion"],
      required: true
    },
    difficulty: {
      type: String,
      enum: ["facil", "medio", "dificil"],
      default: "medio"
    },
    questions: { type: Number, default: 0 },
    sourceLength: { type: Number, default: 0 },
    creditsUsed: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["simulado", "generado", "error"],
      default: "simulado"
    }
  },
  { timestamps: true }
);

export const Material = mongoose.model("Material", materialSchema);
