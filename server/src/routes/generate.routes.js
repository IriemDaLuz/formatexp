import express from "express";
import { getOpenAIClient, OPENAI_MODEL } from "../services/openai.js";

const router = express.Router();



/**
 * POST /api/generate
 * Body: {
 *   type: "test"|"resumen"|"guia",
 *   inputText: string,
 *   questions?: number,
 *   difficulty?: "facil"|"medio"|"dificil"
 * }
 */

// límites para controlar coste/latencia
const MIN_INPUT_CHARS = 50;
const MAX_INPUT_CHARS = 9000; // recorte simple (ajústalo si quieres)
const MAX_OUTPUT_TOKENS = 1200;

// validación
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
  // limpieza ligera
  const t = String(text || "")
    .replace(/\u0000/g, "")
    .trim();

  if (t.length <= MAX_INPUT_CHARS) return t;

  // recorte conservador: inicio + final (mantiene contexto y conclusiones)
  const head = t.slice(0, Math.floor(MAX_INPUT_CHARS * 0.6));
  const tail = t.slice(-Math.floor(MAX_INPUT_CHARS * 0.4));
  return `${head}\n\n[...texto recortado por longitud...]\n\n${tail}`.trim();
}

router.post("/", async (req, res) => {
  try {
    const { type, inputText, questions, difficulty } = req.body || {};

    if (!type || !["test", "resumen", "guia"].includes(type)) {
      return res
        .status(400)
        .json({ error: "Tipo inválido. Usa: test | resumen | guia" });
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

    // System: reglas globales (más “pro” y consistente)
    const system = `
Eres FormatExp, un asistente especializado para PROFESORES.
Objetivo: generar material educativo listo para clase, claro, útil y verificable.
Reglas:
- Escribe en español neutro.
- No inventes datos que no estén en el texto. Si falta info, dilo de forma breve.
- Evita contenido inapropiado o sensible. Mantén un tono profesional.
- Formato limpio y fácil de copiar/pegar.
`.trim();

    // Ajuste por dificultad (estilo, profundidad y trampas)
    const difficultyGuidance = {
      facil: `
Dificultad: FÁCIL.
- Preguntas directas y vocabulario accesible.
- Evita ambigüedad y distractores demasiado parecidos.
`.trim(),
      medio: `
Dificultad: MEDIA.
- Preguntas con comprensión y relación de ideas.
- Distractores plausibles, sin trampas injustas.
`.trim(),
      dificil: `
Dificultad: DIFÍCIL.
- Preguntas de análisis y aplicación.
- Distractores muy plausibles pero verificables en el texto.
- Incluye 1-2 preguntas que conecten conceptos.
`.trim()
    }[diff];

    let instruction = "";

    if (type === "test") {
      instruction = `
Genera un test de opción múltiple basado SOLO en el texto.
${difficultyGuidance}

Requisitos:
- Devuelve ${q} preguntas.
- Cada pregunta con 4 opciones A/B/C/D.
- Indica la opción correcta.
- Añade una explicación de 1 línea citando la idea del texto (sin inventar).

Formato EXACTO por pregunta:
1) Pregunta...
A) ...
B) ...
C) ...
D) ...
 Correcta: B
Explicación: ...
`.trim();
    } else if (type === "resumen") {
      instruction = `
Genera un resumen didáctico del texto.
${difficultyGuidance}

Estructura:
- 8 a 12 viñetas (•) con las ideas principales.
- “Ideas clave” (3 bullets).
- “Términos importantes” (5 términos + definición breve, 1 línea cada uno).

No inventes conceptos que no aparezcan en el texto.
`.trim();
    } else {
      instruction = `
Genera una guía de estudio basada SOLO en el texto.
${difficultyGuidance}

Estructura:
1) Objetivos de aprendizaje (3-6)
2) Esquema por secciones (títulos claros)
3) Puntos clave por sección (bullets)
4) 5 preguntas de repaso (con respuesta corta)
5) Recomendaciones de estudio (3)

No inventes datos: si falta información, indícalo brevemente.
`.trim();
    }

    const prompt = `
TEXTO BASE:
"""
${cleanText}
"""

TAREA:
${instruction}
`.trim();

    // Responses API
    const response = await openai.responses.create({
      model: OPENAI_MODEL || "gpt-4o-mini",
      input: [
        { role: "system", content: system },
        { role: "user", content: prompt }
      ],
      temperature: 0.4,
      max_output_tokens: MAX_OUTPUT_TOKENS
    });

    const outputText = response.output_text || "";

    return res.json({
      type,
      outputText,
      meta: {
        model: OPENAI_MODEL || "gpt-4o-mini",
        difficulty: diff,
        questions: type === "test" ? q : null,
        inputChars: cleanText.length,
        outputChars: outputText.length
      }
    });
  } catch (err) {
    console.error(" Error /api/generate:", err?.message || err);

    // Mensajes más “útiles” según casos comunes
    const msg = String(err?.message || "");
    if (msg.includes("429")) {
      return res.status(429).json({
        error:
          "Límite de uso alcanzado temporalmente. Inténtalo de nuevo en unos minutos."
      });
    }
    if (msg.toLowerCase().includes("api key")) {
      return res.status(500).json({
        error: "Falta configurar OPENAI_API_KEY en el servidor."
      });
    }

    return res.status(500).json({
      error: "Error generando contenido. Revisa logs del servidor."
    });
  }
});

export default router;
