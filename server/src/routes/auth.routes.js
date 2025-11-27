import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { User } from "../models/User.js";
import { config } from "../config.js";
import { authRequired } from "../middleware/auth.js";

export const authRouter = express.Router();

// Helper para crear token
function createToken(user) {
  return jwt.sign(
    {
      sub: user._id.toString(),
      email: user.email,
      plan: user.plan
    },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  );
}

// Registro
authRouter.post("/register", async (req, res, next) => {
  try {
    const { name, email, password, role, center, plan } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: "Nombre, email y contraseña son obligatorios" });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ error: "Ya existe un usuario con ese email" });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // créditos iniciales según plan
    let credits = 100;
    if (plan === "pro") credits = 500;
    if (plan === "academia") credits = 1000;

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      passwordHash,
      role: role || "otros",
      center: center || "",
      plan: plan || "personal",
      credits
    });

    const token = createToken(user);

    res.status(201).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        center: user.center,
        plan: user.plan,
        credits: user.credits
      }
    });
  } catch (err) {
    next(err);
  }
});

// Login
authRouter.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email y contraseña son obligatorios" });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ error: "Credenciales incorrectas" });
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: "Credenciales incorrectas" });
    }

    const token = createToken(user);

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        center: user.center,
        plan: user.plan,
        credits: user.credits
      }
    });
  } catch (err) {
    next(err);
  }
});

// Perfil actual
authRouter.get("/me", authRequired, async (req, res) => {
  res.json({ user: req.user });
});
