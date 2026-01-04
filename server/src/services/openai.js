// server/src/services/openai.js
import OpenAI from "openai";

export const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

export function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return null; // No reventamos el servidor
  }

  return new OpenAI({ apiKey });
}
