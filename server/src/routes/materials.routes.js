// server/src/routes/materials.routes.js
import express from "express";
import { authRequired } from "../middleware/auth.js";
import Material from "../models/Material.js";

const router = express.Router();

// =====================
// GET /api/materials
// =====================
router.get("/", authRequired, async (req, res) => {
  try {
    const materials = await Material.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(100);

    res.json(materials);
  } catch (err) {
    console.error("Error obteniendo materiales:", err);
    res.status(500).json({ error: "Error obteniendo materiales." });
  }
});

// =====================
// POST /api/materials
// =====================
router.post("/", authRequired, async (req, res) => {
  try {
    const {
      title,
      type,
      source,
      difficulty,
      questions,
      estimatedCredits,
      outputText
    } = req.body;

    const material = new Material({
      user: req.user._id,
      title,
      type,
      sourceLength: source?.length || 0,
      difficulty,
      questions,
      credits: estimatedCredits,
      outputText,
      createdAt: new Date()
    });

    await material.save();

    res.status(201).json(material);
  } catch (err) {
    console.error("Error guardando material:", err);
    res.status(500).json({ error: "Error guardando material." });
  }
});

export default router;
