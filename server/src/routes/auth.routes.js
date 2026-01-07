// src/routes/auth.routes.js
import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

const router = express.Router();

function signToken(userId) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET no configurada");

  return jwt.sign(
    { sub: userId },
    secret,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );
}

// REGISTER
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, plan } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({
        error: "Email y contraseña obligatorios."
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        error: "La contraseña debe tener al menos 6 caracteres."
      });
    }

    const existing = await User.findOne({
      email: email.toLowerCase().trim()
    });

    if (existing) {
      return res.status(409).json({
        error: "Este email ya está registrado."
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await User.create({
      name: name || "",
      email: email.toLowerCase().trim(),
      passwordHash,
      plan: plan || "personal"
    });

    const token = signToken(user._id.toString());

    return res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        plan: user.plan,
        role: user.role
      }
    });
  } catch (err) {
    console.error("REGISTER ERROR:", err);
    return res.status(500).json({ error: "Error registrando usuario." });
  }
});

// LOGIN
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({
        error: "Email y contraseña obligatorios."
      });
    }

    const user = await User.findOne({
      email: email.toLowerCase().trim()
    });

    if (!user) {
      return res.status(401).json({ error: "Credenciales inválidas." });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: "Credenciales inválidas." });
    }

    const token = signToken(user._id.toString());

    return res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        plan: user.plan,
        role: user.role
      }
    });
  } catch (err) {
    console.error("LOGIN ERROR:", err);
    return res.status(500).json({ error: "Error en login." });
  }
});

export default router;
