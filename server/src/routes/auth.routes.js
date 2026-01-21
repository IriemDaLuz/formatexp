// server/src/routes/auth.routes.js
import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

const router = express.Router();

function normalizeEmail(email) {
  return String(email || "").toLowerCase().trim();
}

function publicUser(user) {
  return {
    id: user._id?.toString?.() || String(user._id),
    name: user.name || "",
    email: user.email,
    plan: user.plan || "personal",
    role: user.role || "otros",
    center: user.center || "",
    creditsUsed: user.creditsUsed || 0
  };
}

function signToken(userId) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET no configurada");

  return jwt.sign({ sub: userId }, secret, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d"
  });
}

// REGISTER
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, plan, role, center } = req.body || {};
    const emailNorm = normalizeEmail(email);

    if (!emailNorm || !password) {
      return res.status(400).json({ error: "Email y contraseña obligatorios." });
    }

    if (password.length < 6) {
      return res
        .status(400)
        .json({ error: "La contraseña debe tener al menos 6 caracteres." });
    }

    // (Opcional mínimo) validar plan permitido para evitar basura en DB
    const allowedPlans = new Set(["personal", "pro", "academia"]);
    const safePlan = allowedPlans.has(plan) ? plan : "personal";

    const existing = await User.findOne({ email: emailNorm }).select("_id");
    if (existing) {
      return res.status(409).json({ error: "Este email ya está registrado." });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await User.create({
      name: String(name || "").trim(),
      email: emailNorm,
      passwordHash,
      plan: safePlan,
      role: role || "otros",
      center: String(center || "").trim()
    });

    const token = signToken(user._id.toString());
    return res.json({ token, user: publicUser(user) });
  } catch (err) {
    // Duplicado por índice unique (por si hay carrera)
    if (err?.code === 11000) {
      return res.status(409).json({ error: "Este email ya está registrado." });
    }

    console.error("REGISTER ERROR:", err);
    return res.status(500).json({ error: "Error registrando usuario." });
  }
});

// LOGIN
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};
    const emailNorm = normalizeEmail(email);

    if (!emailNorm || !password) {
      return res.status(400).json({ error: "Email y contraseña obligatorios." });
    }

    // Importante: necesitamos passwordHash para comparar
    const user = await User.findOne({ email: emailNorm });

    // IMPORTANTE para tu frontend MVP: 404 => user not found (puede registrar)
    if (!user) {
      return res.status(404).json({ error: "Usuario no encontrado." });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      // 401 => credenciales incorrectas (NO registrar)
      return res.status(401).json({ error: "Credenciales inválidas." });
    }

    const token = signToken(user._id.toString());
    return res.json({ token, user: publicUser(user) });
  } catch (err) {
    console.error("LOGIN ERROR:", err);
    return res.status(500).json({ error: "Error en login." });
  }
});

export default router;
