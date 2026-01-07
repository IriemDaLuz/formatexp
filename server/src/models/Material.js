// server/src/models/Material.js
import mongoose from "mongoose";

const materialSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    type: {
      type: String,
      enum: ["test", "resumen", "guia", "presentacion"],
      required: true
    },
    sourceLength: {
      type: Number,
      default: 0
    },
    difficulty: {
      type: String,
      enum: ["facil", "medio", "dificil"],
      default: "medio"
    },
    questions: {
      type: Number,
      default: 0
    },
    credits: {
      type: Number,
      default: 0
    },
    outputText: {
      type: String,
      default: ""
    }
  },
  {
    timestamps: true
  }
);

const Material = mongoose.model("Material", materialSchema);
export default Material;
