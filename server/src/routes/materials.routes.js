import express from "express";
import { Material } from "../models/Material.js";
import { authRequired } from "../middleware/auth.js";

export const materialsRouter = express.Router();

// Todas las rutas requieren auth
materialsRouter.use(authRequired);

// Listar materiales del usuario
materialsRouter.get("/", async (req, res, next) => {
  try {
    const items = await Material.find({ owner: req.user._id }).sort({
      createdAt: -1
    });
    res.json(items);
  } catch (err) {
    next(err);
  }
});

// Crear material (generación simulada, pero guardado real)
materialsRouter.post("/", async (req, res, next) => {
  try {
    const { title, type, difficulty, questions, sourceLength, creditsUsed } =
      req.body;

    if (!title || !type) {
      return res.status(400).json({ error: "Título y tipo son obligatorios" });
    }

    const credits = Number(creditsUsed) || 0;

    // En un futuro: comprobar saldo de créditos del usuario antes de permitirlo
    const item = await Material.create({
      owner: req.user._id,
      title,
      type,
      difficulty: difficulty || "medio",
      questions: Number(questions) || 0,
      sourceLength: Number(sourceLength) || 0,
      creditsUsed: credits,
      status: "simulado"
    });

    res.status(201).json(item);
  } catch (err) {
    next(err);
  }
});
