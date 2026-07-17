import type { NextFunction, Request, Response } from "express";
import { tokenDogrula, type JwtIcerik } from "../services/auth.js";

declare global {
  namespace Express {
    interface Request {
      auth?: JwtIcerik;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.header("authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;
  const icerik = token ? tokenDogrula(token) : null;
  if (!icerik) {
    res.status(401).json({ error: "Giriş yapmanız gerekiyor." });
    return;
  }
  req.auth = icerik;
  next();
}
