import { createHash } from "node:crypto";
import { InferenceClient } from "@huggingface/inference";
import { db } from "../db/store.js";

// Uses the official @huggingface/inference client so we never have to guess at HF's
// hosted API hosts/paths ourselves — it resolves the right Inference Provider per model/task
// and stays correct as HF's routing evolves.

function getClient(): InferenceClient {
  const token = process.env.HF_TOKEN || db.data.settings.hf_token;
  if (!token) {
    throw new Error("Hugging Face token ayarlanmamış. Ayarlar sayfasından HF Access Token girin.");
  }
  return new InferenceClient(token);
}

export interface SohbetTuru {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LlmYanit {
  yanit: string;
  durum: "devam" | "sonlandir";
  degiskenler: Record<string, string>;
}

const MAX_NEW_TOKENS = 120;

export async function transcribeAudio(audio: Buffer, mime: string): Promise<string> {
  const model = db.data.settings.hf_stt_model;
  const out = await getClient().automaticSpeechRecognition({
    model,
    data: new Blob([audio], { type: mime || "audio/webm" }),
  });
  return (out.text ?? "").trim();
}

// Turn-based generation only ever sees a sliding window of history (cost control),
// and is instructed to return strict JSON so the orchestrator/rule engine can act on it
// without a heavier function-calling setup.
export async function generateReply(
  systemPrompt: string,
  history: SohbetTuru[],
): Promise<LlmYanit> {
  const model = db.data.settings.hf_llm_model;
  const jsonYonergesi = `Yalnızca aşağıdaki JSON şemasıyla yanıt ver, başka hiçbir metin ekleme:
{"yanit": "kullanıcıya söylenecek kısa Türkçe cümle", "durum": "devam" veya "sonlandir", "degiskenler": {"anahtar": "deger"}}`;

  const out = await getClient().chatCompletion({
    model,
    messages: [{ role: "system", content: `${systemPrompt}\n\n${jsonYonergesi}` }, ...history],
    max_tokens: MAX_NEW_TOKENS,
    temperature: 0.6,
  });
  const raw = out.choices?.[0]?.message?.content ?? "";
  return parseLlmJson(raw);
}

function parseLlmJson(raw: string): LlmYanit {
  const temizlenmis = raw.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "");
  try {
    const parsed = JSON.parse(temizlenmis);
    return {
      yanit: String(parsed.yanit ?? "").trim() || "Anlayamadım, tekrar eder misiniz?",
      durum: parsed.durum === "sonlandir" ? "sonlandir" : "devam",
      degiskenler: typeof parsed.degiskenler === "object" && parsed.degiskenler ? parsed.degiskenler : {},
    };
  } catch {
    // Model didn't return clean JSON — fall back to using the raw text as the reply
    // rather than failing the whole turn.
    return { yanit: temizlenmis || "Anlayamadım, tekrar eder misiniz?", durum: "devam", degiskenler: {} };
  }
}

const ttsOnbellek = new Map<string, { buffer: Buffer; mime: string }>();

// Identical lines (greetings, canned rule responses) are synthesized once and reused,
// so repeat calls of the same scenario don't re-hit the TTS model for the same text.
export async function synthesizeSpeech(text: string): Promise<{ buffer: Buffer; mime: string }> {
  const model = db.data.settings.hf_tts_model;
  const key = createHash("sha256").update(`${model}::${text}`).digest("hex");
  const onbellekte = ttsOnbellek.get(key);
  if (onbellekte) return onbellekte;

  const blob = await getClient().textToSpeech({ model, inputs: text });
  const buffer = Buffer.from(await blob.arrayBuffer());
  const sonuc = { buffer, mime: blob.type || "audio/flac" };
  ttsOnbellek.set(key, sonuc);
  return sonuc;
}
