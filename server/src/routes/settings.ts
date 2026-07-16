import { Router } from "express";
import { settingsRepo } from "../db/repo.js";
import type { Settings } from "../types.js";

export const settingsRouter = Router();

function disaAktar(s: Settings) {
  return {
    hf_token_ayarli: Boolean(process.env.HF_TOKEN || s.hf_token),
    hf_llm_model: s.hf_llm_model,
    hf_stt_model: s.hf_stt_model,
    hf_tts_model: s.hf_tts_model,
    mod: s.mod,
    max_tur: s.max_tur,
    twilio_ayarli: Boolean(s.twilio_account_sid && s.twilio_auth_token && s.twilio_phone_number),
    twilio_account_sid: s.twilio_account_sid,
    twilio_phone_number: s.twilio_phone_number,
  };
}

settingsRouter.get("/", (_req, res) => {
  res.json(disaAktar(settingsRepo.get()));
});

settingsRouter.put("/", async (req, res) => {
  const body = req.body ?? {};
  const patch: Partial<Settings> = {};
  if (body.hf_token) patch.hf_token = body.hf_token;
  if (body.hf_llm_model) patch.hf_llm_model = body.hf_llm_model;
  if (body.hf_stt_model) patch.hf_stt_model = body.hf_stt_model;
  if (body.hf_tts_model) patch.hf_tts_model = body.hf_tts_model;
  if (body.mod === "simulasyon" || body.mod === "twilio") patch.mod = body.mod;
  if (typeof body.max_tur === "number") patch.max_tur = body.max_tur;
  if (body.twilio_account_sid !== undefined) patch.twilio_account_sid = body.twilio_account_sid;
  if (body.twilio_auth_token) patch.twilio_auth_token = body.twilio_auth_token;
  if (body.twilio_phone_number !== undefined) patch.twilio_phone_number = body.twilio_phone_number;

  const updated = await settingsRepo.update(patch);
  res.json(disaAktar(updated));
});
