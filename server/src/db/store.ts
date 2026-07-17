import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error(
    "DATABASE_URL ortam değişkeni ayarlanmamış. server/.env dosyasına bir Postgres bağlantı adresi ekleyin.",
  );
}

// Managed Postgres providers (Neon, Supabase, Render, ...) require SSL and typically use
// certificates that aren't in Node's default trust store; local/dev Postgres doesn't need
// SSL at all. Toggling on host is a pragmatic default — override with PGSSL=false if needed.
const isLocal = /localhost|127\.0\.0\.1/.test(connectionString);
export const pool = new Pool({
  connectionString,
  ssl: !isLocal && process.env.PGSSL !== "false" ? { rejectUnauthorized: false } : undefined,
});

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS scenarios (
  id UUID PRIMARY KEY,
  ad TEXT NOT NULL,
  yon TEXT NOT NULL,
  sistem_promptu TEXT NOT NULL,
  karsilama_mesaji TEXT NOT NULL,
  kurallar JSONB NOT NULL DEFAULT '[]',
  toplanacak_degiskenler JSONB NOT NULL DEFAULT '[]',
  aktif BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS calls (
  id UUID PRIMARY KEY,
  scenario_id UUID NOT NULL REFERENCES scenarios(id) ON DELETE CASCADE,
  yon TEXT NOT NULL,
  mod TEXT NOT NULL,
  karsi_taraf TEXT NOT NULL,
  durum TEXT NOT NULL,
  sonuc JSONB,
  kullanim JSONB NOT NULL DEFAULT '{"stt_cagri":0,"llm_cagri":0,"tts_cagri":0,"tahmini_token":0}',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS call_turns (
  id UUID PRIMARY KEY,
  call_id UUID NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
  konusmaci TEXT NOT NULL,
  metin TEXT NOT NULL,
  ses_url TEXT,
  ts TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_calls_scenario_id ON calls (scenario_id);
CREATE INDEX IF NOT EXISTS idx_call_turns_call_id ON call_turns (call_id);

-- Singleton row (id always 1) holding app-wide settings/credentials.
CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  hf_token TEXT,
  hf_llm_model TEXT NOT NULL DEFAULT 'Qwen/Qwen2.5-7B-Instruct',
  hf_stt_model TEXT NOT NULL DEFAULT 'openai/whisper-large-v3',
  elevenlabs_api_key TEXT,
  elevenlabs_voice_id TEXT NOT NULL DEFAULT 'JBFqnCBsd6RMkjVDRZzb',
  mod TEXT NOT NULL DEFAULT 'simulasyon',
  max_tur INTEGER NOT NULL DEFAULT 12,
  twilio_account_sid TEXT,
  twilio_auth_token TEXT,
  twilio_phone_number TEXT
);

INSERT INTO settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
`;

await pool.query(SCHEMA);
