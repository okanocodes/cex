import { Router } from "express";
import { userRepo } from "../db/repo.js";
import { sifreyiDogrula, sifreyiHashle, tokenDogrula, tokenOlustur } from "../services/auth.js";

export const authRouter = Router();

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

authRouter.post("/register", async (req, res) => {
  const { email, password } = req.body ?? {};
  if (typeof email !== "string" || !EMAIL_REGEX.test(email)) {
    return res.status(400).json({ error: "Geçerli bir e-posta adresi girin." });
  }
  if (typeof password !== "string" || password.length < 6) {
    return res.status(400).json({ error: "Şifre en az 6 karakter olmalı." });
  }

  const mevcut = await userRepo.getByEmail(email);
  if (mevcut) {
    return res.status(409).json({ error: "Bu e-posta adresi zaten kayıtlı." });
  }

  const hash = await sifreyiHashle(password);
  const user = await userRepo.create(email, hash);
  const token = tokenOlustur({ userId: user.id, email: user.email });
  res.status(201).json({ token, email: user.email });
});

authRouter.post("/login", async (req, res) => {
  const { email, password } = req.body ?? {};
  if (typeof email !== "string" || typeof password !== "string") {
    return res.status(400).json({ error: "E-posta ve şifre zorunludur." });
  }

  const user = await userRepo.getByEmail(email);
  const eslesti = user ? await sifreyiDogrula(password, user.password_hash) : false;
  if (!user || !eslesti) {
    return res.status(401).json({ error: "E-posta veya şifre hatalı." });
  }

  const token = tokenOlustur({ userId: user.id, email: user.email });
  res.json({ token, email: user.email });
});

authRouter.get("/me", (req, res) => {
  const header = req.header("authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;
  const icerik = token ? tokenDogrula(token) : null;
  if (!icerik) {
    return res.status(401).json({ error: "Giriş yapmanız gerekiyor." });
  }
  res.json({ email: icerik.email });
});
