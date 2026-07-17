import { InferenceClient } from "@huggingface/inference";
import { settingsRepo } from "../db/repo.js";

// Uses the official @huggingface/inference client so we never have to guess at HF's
// hosted API hosts/paths ourselves — it resolves the right Inference Provider per model/task
// and stays correct as HF's routing evolves.

async function getClient(): Promise<InferenceClient> {
  const settings = await settingsRepo.get();
  const token = process.env.HF_TOKEN || settings.hf_token;
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
  const settings = await settingsRepo.get();
  const client = await getClient();
  const out = await client.automaticSpeechRecognition({
    model: settings.hf_stt_model,
    data: new Blob([audio], { type: mime || "audio/webm" }),
  });
  return (out.text ?? "").trim();
}

// Turn-based generation only ever sees a sliding window of history (cost control),
// and is instructed to return strict JSON so the orchestrator/rule engine can act on it
// without a heavier function-calling setup.
export async function generateReply(
  systemPrompt: string,
  toplanacakDegiskenler: string[],
  history: SohbetTuru[],
): Promise<LlmYanit> {
  const settings = await settingsRepo.get();
  const client = await getClient();
  const degiskenYonergesi = toplanacakDegiskenler.length
    ? `Bu senaryoda toplanması gereken bilgiler: ${toplanacakDegiskenler.join(", ")}. Kullanıcı bu bilgilerden birini bu turda AÇIKÇA söylediyse "degiskenler" alanına sadece o anahtarla ve kullanıcının gerçekten söylediği değerle ekle (örn. {"sehir": "İstanbul"}). Söylemediyse o anahtarı hiç ekleme. Asla şablon/placeholder değer ("Adınız" gibi) yazma, başka anahtar adı uydurma.`
    : `Bu senaryoda toplanacak bir değişken tanımlı değil, "degiskenler" alanını her zaman boş obje {} bırak.`;
  const jsonYonergesi = `Yanıtını SADECE aşağıdaki JSON formatında ver — başında, sonunda veya içinde başka hiçbir açıklama, yorum ya da metin OLMASIN:
{"yanit": "kullanıcıya söylenecek kısa Türkçe cümle", "durum": "devam", "degiskenler": {}}
"durum" alanı görüşme bitmeliyse "sonlandir", devam etmeliyse "devam" olmalı. ${degiskenYonergesi}`;

  const out = await client.chatCompletion({
    model: settings.hf_llm_model,
    messages: [{ role: "system", content: `${systemPrompt}\n\n${jsonYonergesi}` }, ...history],
    max_tokens: MAX_NEW_TOKENS,
    temperature: 0.6,
  });
  const raw = out.choices?.[0]?.message?.content ?? "";
  return parseLlmJson(raw);
}

const VARSAYILAN_YANIT = "Anlayamadım, tekrar eder misiniz?";

function parseLlmJson(raw: string): LlmYanit {
  const temizlenmis = raw.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "");

  // Try the whole trimmed string first, then fall back to just the {...} substring —
  // handles cases where the model wraps valid JSON in extra prose.
  const blobEslesme = temizlenmis.match(/\{[\s\S]*\}/);
  const adaylar = blobEslesme ? [temizlenmis, blobEslesme[0]] : [temizlenmis];

  for (const aday of adaylar) {
    try {
      const parsed = JSON.parse(aday);
      const yanit = String(parsed.yanit ?? "").trim();
      if (yanit) {
        return {
          yanit,
          durum: parsed.durum === "sonlandir" ? "sonlandir" : "devam",
          degiskenler: typeof parsed.degiskenler === "object" && parsed.degiskenler ? parsed.degiskenler : {},
        };
      }
    } catch {
      // try the next candidate, if any
    }
  }

  // Nothing usable parsed. Never speak raw JSON syntax to the user — only fall back to
  // the model's free text if it genuinely doesn't look like a broken JSON object.
  const jsonBenzeri = /^[[{]/.test(temizlenmis) || /"yanit"|"degiskenler"|"durum"/.test(temizlenmis);
  return { yanit: !jsonBenzeri && temizlenmis ? temizlenmis : VARSAYILAN_YANIT, durum: "devam", degiskenler: {} };
}
