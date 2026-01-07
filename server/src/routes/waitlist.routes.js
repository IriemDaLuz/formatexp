import express from "express";
import WaitlistEntry from "../models/WaitlistEntry.js";

const router = express.Router();

/**
 * POST /api/waitlist
 * Guarda usuarios interesados (landing)
 */
router.post("/", async (req, res) => {
  try {
    const { name, email, role, center, plan, consent, source } = req.body;

    if (!email) {
      return res.status(400).json({
        error: "Email requerido"
      });
    }

    const entry = new WaitlistEntry({
      name,
      email,
      role,
      center,
      plan,
      consent: Boolean(consent),
      source: source || "landing",
      createdAt: new Date()
    });

    await entry.save();

    res.status(201).json({
      message: "Usuario añadido a la waitlist"
    });
  } catch (err) {
    console.error("Error en waitlist:", err);
    res.status(500).json({
      error: "Error guardando en la waitlist"
    });
  }
});

export default router;
