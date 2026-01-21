// server/src/routes/generate.routes.js
import express from "express";
import { getOpenAIClient, OPENAI_MODEL } from "../services/openai.js";
import { authRequired } from "../middleware/auth.js";
import { getPlanCredits, getCostByType } from "../utils/credits.js";
import User from "../models/User.js";

const router = express.Router();

/**
 * POST /api/generate
 * Body:
 * {
 *   type: "test" | "resumen" | "guia",
 *   inputText: string,
 *   questions?: number,
 *   difficulty?: "facil" | "medio" | "dificil"
 * }
 */

// ==================
// LIMITES
// ==================
const MIN_INPUT_CHARS = 50;
const MAX_INPUT_CHARS = 9000;
const MAX_OUTPUT_TOKENS = 1200;

// ==================
// HELPERS
// ==================
function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function normalizeDifficulty(value) {
  const v = String(value || "").trim().toLowerCase();
  if (v === "facil" || v === "fácil") return "facil";
  if (v === "dificil" || v === "difícil") return "dificil";
  return "medio";
}

function sanitizeText(text) {
  const t = String(text || "").replace(/\u0000/g, "").trim();

  if (t.length <= MAX_INPUT_CHARS) return t;

  const head = t.slice(0, Math.floor(MAX_INPUT_CHARS * 0.6));
  const tail = t.slice(-Math.floor(MAX_INPUT_CHARS * 0.4));

  return `${head}\n\n[...texto recortado por longitud...]\n\n${tail}`.trim();
}

// ==================
// ROUTE
// ==================
router.post("/", authRequired, async (req, res) => {
  try {
    const { type, inputText, questions, difficulty } = req.body || {};

    // -------- VALIDACIÓN --------
    if (!["test", "resumen", "guia"].includes(type)) {
      return res.status(400).json({
        error: "Tipo inválido. Usa: test | resumen | guia"
      });
    }

    const cleanText = sanitizeText(inputText);

    if (cleanText.length < MIN_INPUT_CHARS) {
      return res.status(400).json({
        error: "Pega un texto un poco más largo (mínimo ~50 caracteres)."
      });
    }

    const diff = normalizeDifficulty(difficulty);
    const q = Number.isFinite(Number(questions))
      ? clamp(Number(questions), 3, 25)
      : 10;

    // -------- CRÉDITOS (BACKEND REAL) --------
    // middleware adjunta req.user y req.userId
    const userId = req.userId || req.user?._id;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(401).json({ error: "Usuario no válido." });
    }

    const totalCredits = getPlanCredits(user.plan);
    const usedCredits = Number(user.creditsUsed || 0);
    const cost = Number(getCostByType(type) || 0);
    const remaining = totalCredits - usedCredits;

    if (remaining < cost) {
      return res.status(402).json({
        error: "No tienes suficientes créditos para generar este material.",
        remainingCredits: remaining
      });
    }

    // -------- PROMPT SYSTEM --------
    const system = `
Eres FormatExp, un asistente especializado para PROFESORES.
Objetivo: generar material educativo listo para clase.
Reglas:
- Español neutro
- No inventes datos
- Tono profesional
- Formato claro y estructurado
`.trim();

    const difficultyGuidance = {
      facil: "Dificultad fácil. Lenguaje simple.",
      medio: "Dificultad media. Comprensión y relación de ideas.",
      dificil: "Dificultad alta. Análisis y aplicación."
    }[diff];

    let instruction = "";

    if (type === "test") {
      instruction = `
Genera un test basado SOLO en el texto.
${difficultyGuidance}

- ${q} preguntas
- 4 opciones A/B/C/D
- Indica la correcta
- Explicación breve
`.trim();
    } else if (type === "resumen") {
      instruction = `
Genera un resumen didáctico.
${difficultyGuidance}

- 8-12 viñetas
- Ideas clave
- Términos importantes
`.trim();
    } else {
      instruction = `
Genera una guía de estudio.
${difficultyGuidance}

1) Objetivos
2) Esquema
3) Puntos clave
4) Preguntas de repaso
5) Recomendaciones
`.trim();
    }

    const prompt = `
TEXTO:
"""
${cleanText}
"""

TAREA:
${instruction}
`.trim();

    // -------- OPENAI --------
    const openai = getOpenAIClient();
    if (!openai) {
      return res.status(500).json({
        error: "OPENAI_API_KEY no configurada."
      });
    }

    const response = await openai.responses.create({
      model: OPENAI_MODEL || "gpt-4o-mini",
      input: [
        { role: "system", content: system },
        { role: "user", content: prompt }
      ],
      temperature: 0.4,
      max_output_tokens: MAX_OUTPUT_TOKENS
    });

    const outputText = String(response.output_text || "").trim();

    // -------- DESCONTAR CRÉDITOS (ROBUSTO) --------
    user.creditsUsed = Number(user.creditsUsed || 0) + cost;
    await user.save();

    // -------- RESPUESTA --------
    return res.json({
      type,
      outputText,
      credits: {
        used: user.creditsUsed,
        total: totalCredits,
        remaining: totalCredits - user.creditsUsed
      },
      meta: {
        model: OPENAI_MODEL || "gpt-4o-mini",
        difficulty: diff,
        questions: type === "test" ? q : null,
        inputChars: cleanText.length,
        outputChars: outputText.length
      }
    });
  } catch (err) {
    console.error("Error /api/generate:", err);

    if (String(err.message || "").includes("429")) {
      return res.status(429).json({
        error: "Límite de uso alcanzado. Inténtalo más tarde."
      });
    }

    return res.status(500).json({
      error: "Error generando contenido."
    });
  }
});

export default router;
