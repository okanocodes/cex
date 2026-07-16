import { Router } from "express";
import { aramaRepo, senaryoRepo, settingsRepo } from "../db/repo.js";

export const callsRouter = Router();

callsRouter.get("/", (_req, res) => {
  res.json(aramaRepo.list());
});

callsRouter.get("/:id", (req, res) => {
  const arama = aramaRepo.get(req.params.id);
  if (!arama) return res.status(404).json({ error: "Arama bulunamadı" });
  res.json(arama);
});

callsRouter.get("/:id/turns", (req, res) => {
  res.json(aramaRepo.turns(req.params.id));
});

callsRouter.post("/", async (req, res) => {
  const { scenario_id, yon } = req.body ?? {};
  const senaryo = senaryoRepo.get(scenario_id);
  if (!senaryo) return res.status(404).json({ error: "Senaryo bulunamadı" });
  const settings = settingsRepo.get();
  const arama = await aramaRepo.create({
    scenario_id,
    yon: yon === "gelen" ? "gelen" : "giden",
    mod: settings.mod,
    karsi_taraf: settings.mod === "twilio" ? settings.twilio_phone_number ?? "Bilinmiyor" : "Simülasyon",
    durum: "beklemede",
  });
  res.status(201).json(arama);
});
