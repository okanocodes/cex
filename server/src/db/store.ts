import path from "node:path";
import { fileURLToPath } from "node:url";
import { JSONFilePreset } from "lowdb/node";
import type { DbSchema } from "../types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbFile = path.join(__dirname, "..", "..", "data", "db.json");

const defaultData: DbSchema = {
  scenarios: [],
  calls: [],
  call_turns: [],
  settings: {
    hf_llm_model: "Qwen/Qwen2.5-7B-Instruct",
    hf_stt_model: "openai/whisper-large-v3",
    hf_tts_model: "ResembleAI/chatterbox",
    mod: "simulasyon",
    max_tur: 12,
  },
};

export const db = await JSONFilePreset<DbSchema>(dbFile, defaultData);
