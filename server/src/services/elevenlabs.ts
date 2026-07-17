import { createHash } from "node:crypto";
import { settingsRepo } from "../db/repo.js";

// TTS runs on ElevenLabs rather than Hugging Face. Investigated first: the only live
// HF-hosted TTS model reachable via Inference Providers (ResembleAI/chatterbox) only
// exposes its English-only "standard" endpoint through HF's routing — its genuine
// multilingual/Turkish mode lives on a different fal.ai route HF never registered.
// No other live HF-hosted TTS model claims Turkish support either. eleven_multilingual_v2
// has verified native Turkish support, so this one piece of the pipeline calls it directly.
// STT and the LLM remain on Hugging Face.
const ELEVENLABS_BASE = "https://api.elevenlabs.io/v1";
const MODEL_ID = "eleven_multilingual_v2";

async function getApiKey(): Promise<string> {
  const settings = await settingsRepo.get();
  const key = process.env.ELEVENLABS_API_KEY || settings.elevenlabs_api_key;
  if (!key) {
    throw new Error("ElevenLabs API anahtarı ayarlanmamış. Ayarlar sayfasından girin.");
  }
  return key;
}

const ttsOnbellek = new Map<string, { buffer: Buffer; mime: string }>();

// Identical lines (greetings, canned rule responses) are synthesized once and reused,
// so repeat calls of the same scenario don't re-hit the TTS API for the same text.
export async function synthesizeSpeech(text: string): Promise<{ buffer: Buffer; mime: string }> {
  const settings = await settingsRepo.get();
  const voiceId = settings.elevenlabs_voice_id;
  const key = createHash("sha256").update(`${voiceId}::${text}`).digest("hex");
  const onbellekte = ttsOnbellek.get(key);
  if (onbellekte) return onbellekte;

  const apiKey = await getApiKey();
  const res = await fetch(`${ELEVENLABS_BASE}/text-to-speech/${voiceId}`, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text,
      model_id: MODEL_ID,
      // language_code is intentionally omitted — unsupported by multilingual_v2,
      // which infers the language from the input text itself.
    }),
  });
  if (!res.ok) {
    throw new Error(`TTS hatası (${res.status}): ${await res.text()}`);
  }
  const buffer = Buffer.from(await res.arrayBuffer());
  const sonuc = { buffer, mime: "audio/mpeg" };
  ttsOnbellek.set(key, sonuc);
  return sonuc;
}
