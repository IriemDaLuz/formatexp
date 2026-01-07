import jwt from "jsonwebtoken";
import User from "../models/User.js";

export async function authRequired(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const [type, token] = header.split(" ");

    if (type !== "Bearer" || !token) {
      return res.status(401).json({ error: "No autenticado." });
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      return res.status(500).json({ error: "JWT_SECRET no configurada." });
    }

    const payload = jwt.verify(token, secret);
    const userId = payload?.sub;

    const user = await User.findById(userId).select(
      "name email plan role creditsUsed"
    );

    if (!user) {
      return res.status(401).json({ error: "Usuario no válido." });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Token inválido o expirado." });
  }
}
