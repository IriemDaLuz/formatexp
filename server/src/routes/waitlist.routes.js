import express from "express";
import { WaitlistEntry } from "../models/WaitlistEntry.js";

export const waitlistRouter = express.Router();

waitlistRouter.post("/", async (req, res, next) => {
  try {
    const { name, email, role, center, plan, consent, source } = req.body;

    if (!name || !email) {
      return res.status(400).json({ error: "Nombre y email son obligatorios" });
    }

    const entry = await WaitlistEntry.create({
      name,
      email: email.toLowerCase(),
      role: role || "",
      center: center || "",
      plan: plan || "",
      consent: Boolean(consent),
      source: source || "landing"
    });

    res.status(201).json({ id: entry._id });
  } catch (err) {
    next(err);
  }
});
