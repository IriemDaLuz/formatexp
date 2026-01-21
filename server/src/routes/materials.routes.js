// server/src/routes/materials.routes.js
import express from "express";
import mongoose from "mongoose";
import { authRequired } from "../middleware/auth.js";
import Material from "../models/Material.js";

const router = express.Router();

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

function toPublicMaterial(m) {
  return {
    id: m._id?.toString?.() || String(m._id),
    title: m.title,
    type: m.type,
    sourceLength: m.sourceLength || 0,
    difficulty: m.difficulty,
    questions: m.questions || 0,
    credits: m.credits || 0,
    outputText: m.outputText || "",
    createdAt: m.createdAt,
    updatedAt: m.updatedAt
  };
}

// =====================
// GET /api/materials
// =====================
router.get("/", authRequired, async (req, res) => {
  try {
    const materials = await Material.find({ user: req.userId })
      .sort({ createdAt: -1 })
      .limit(100);

    return res.json(materials.map(toPublicMaterial));
  } catch (err) {
    console.error("Error obteniendo materiales:", err);
    return res.status(500).json({ error: "Error obteniendo materiales." });
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
    } = req.body || {};

    if (!title || !String(title).trim()) {
      return res.status(400).json({ error: "Título obligatorio." });
    }

    if (!type || !String(type).trim()) {
      return res.status(400).json({ error: "Tipo obligatorio." });
    }

    const q = Number(questions);
    const credits = Number(estimatedCredits);

    const material = await Material.create({
      user: req.userId,
      title: String(title).trim(),
      type: String(type).trim(),
      sourceLength: typeof source === "string" ? source.length : 0,
      difficulty: difficulty || "medio",
      questions: Number.isFinite(q) ? q : 0,
      credits: Number.isFinite(credits) ? credits : 0,
      outputText: typeof outputText === "string" ? outputText : ""
    });

    return res.status(201).json(toPublicMaterial(material));
  } catch (err) {
    console.error("Error guardando material:", err);
    return res.status(500).json({ error: "Error guardando material." });
  }
});

// =====================
// PUT /api/materials/:id
// =====================
router.put("/:id", authRequired, async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ error: "ID inválido." });
    }

    const update = {};

    if ("title" in (req.body || {})) {
      const t = String(req.body.title || "").trim();
      if (!t) return res.status(400).json({ error: "Título inválido." });
      update.title = t;
    }

    if ("type" in (req.body || {})) {
      const t = String(req.body.type || "").trim();
      if (!t) return res.status(400).json({ error: "Tipo inválido." });
      update.type = t;
    }

    if ("difficulty" in (req.body || {})) {
      update.difficulty = req.body.difficulty || "medio";
    }

    if ("questions" in (req.body || {})) {
      const q = Number(req.body.questions);
      update.questions = Number.isFinite(q) ? q : 0;
    }

    if ("credits" in (req.body || {})) {
      const c = Number(req.body.credits);
      update.credits = Number.isFinite(c) ? c : 0;
    }

    if ("outputText" in (req.body || {})) {
      update.outputText = typeof req.body.outputText === "string" ? req.body.outputText : "";
    }

    const updated = await Material.findOneAndUpdate(
      { _id: id, user: req.userId },
      { $set: update },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ error: "Material no encontrado." });
    }

    return res.json(toPublicMaterial(updated));
  } catch (err) {
    console.error("Error actualizando material:", err);
    return res.status(500).json({ error: "Error actualizando material." });
  }
});

// =====================
// DELETE /api/materials/:id
// =====================
router.delete("/:id", authRequired, async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ error: "ID inválido." });
    }

    const deleted = await Material.findOneAndDelete({
      _id: id,
      user: req.userId
    });

    if (!deleted) {
      return res.status(404).json({ error: "Material no encontrado." });
    }

    return res.json({ ok: true, id });
  } catch (err) {
    console.error("Error borrando material:", err);
    return res.status(500).json({ error: "Error borrando material." });
  }
});

export default router;
