// server/src/middleware/auth.js
import jwt from "jsonwebtoken";
import User from "../models/User.js";

export async function authRequired(req, res, next) {
  try {
    const header = String(req.headers.authorization || "").trim();

    // Formato esperado: "Bearer <token>"
    const parts = header.split(" ").filter(Boolean);
    const type = parts[0];
    const token = parts[1];

    if (type !== "Bearer" || !token) {
      return res.status(401).json({ error: "No autenticado." });
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      // esto es error de configuración, no del usuario
      return res.status(500).json({ error: "JWT_SECRET no configurada." });
    }

    let payload;
    try {
      payload = jwt.verify(token, secret);
    } catch (_e) {
      return res.status(401).json({ error: "Token inválido o expirado." });
    }

    const userId = payload?.sub;
    if (!userId) {
      return res.status(401).json({ error: "Token inválido." });
    }

    // Cargar usuario y adjuntar al request
    const user = await User.findById(userId).select(
      "name email plan role center creditsUsed"
    );

    if (!user) {
      return res.status(401).json({ error: "Usuario no válido." });
    }

    req.userId = user._id.toString();
    req.user = user;

    return next();
  } catch (err) {
    console.error("AUTH MIDDLEWARE ERROR:", err);
    // aquí sí es error inesperado del servidor
    return res.status(500).json({ error: "Error autenticando la sesión." });
  }
}
