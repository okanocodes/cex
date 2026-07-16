import { Router } from "express";
import { senaryoRepo } from "../db/repo.js";

export const scenariosRouter = Router();

scenariosRouter.get("/", (_req, res) => {
  res.json(senaryoRepo.list());
});

scenariosRouter.get("/:id", (req, res) => {
  const senaryo = senaryoRepo.get(req.params.id);
  if (!senaryo) return res.status(404).json({ error: "Senaryo bulunamadı" });
  res.json(senaryo);
});

scenariosRouter.post("/", async (req, res) => {
  const { ad, yon, sistem_promptu, karsilama_mesaji, kurallar, toplanacak_degiskenler, aktif } = req.body ?? {};
  if (!ad || !sistem_promptu || !karsilama_mesaji) {
    return res.status(400).json({ error: "ad, sistem_promptu ve karsilama_mesaji zorunludur" });
  }
  const senaryo = await senaryoRepo.create({
    ad,
    yon: yon ?? "her_ikisi",
    sistem_promptu,
    karsilama_mesaji,
    kurallar: kurallar ?? [],
    toplanacak_degiskenler: toplanacak_degiskenler ?? [],
    aktif: aktif ?? true,
  });
  res.status(201).json(senaryo);
});

scenariosRouter.put("/:id", async (req, res) => {
  const senaryo = await senaryoRepo.update(req.params.id, req.body ?? {});
  if (!senaryo) return res.status(404).json({ error: "Senaryo bulunamadı" });
  res.json(senaryo);
});

scenariosRouter.delete("/:id", async (req, res) => {
  await senaryoRepo.remove(req.params.id);
  res.status(204).end();
});
