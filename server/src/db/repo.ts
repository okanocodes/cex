import { randomUUID } from "node:crypto";
import { pool } from "./store.js";
import type { Arama, AramaTuru, Senaryo, Settings, User } from "../types.js";

function userFromRow(row: Record<string, unknown>): User {
  return {
    id: row.id as string,
    email: row.email as string,
    password_hash: row.password_hash as string,
    created_at: (row.created_at as Date).toISOString(),
  };
}

export const userRepo = {
  getByEmail: async (email: string): Promise<User | undefined> => {
    const { rows } = await pool.query("SELECT * FROM users WHERE email = $1", [email.toLowerCase()]);
    return rows[0] ? userFromRow(rows[0]) : undefined;
  },
  create: async (email: string, passwordHash: string): Promise<User> => {
    const id = randomUUID();
    const { rows } = await pool.query(
      "INSERT INTO users (id, email, password_hash) VALUES ($1, $2, $3) RETURNING *",
      [id, email.toLowerCase(), passwordHash],
    );
    return userFromRow(rows[0]);
  },
};

function senaryoFromRow(row: Record<string, unknown>): Senaryo {
  return {
    id: row.id as string,
    ad: row.ad as string,
    yon: row.yon as Senaryo["yon"],
    sistem_promptu: row.sistem_promptu as string,
    karsilama_mesaji: row.karsilama_mesaji as string,
    kurallar: row.kurallar as Senaryo["kurallar"],
    toplanacak_degiskenler: row.toplanacak_degiskenler as string[],
    aktif: row.aktif as boolean,
    created_at: (row.created_at as Date).toISOString(),
  };
}

export const senaryoRepo = {
  list: async (): Promise<Senaryo[]> => {
    const { rows } = await pool.query("SELECT * FROM scenarios ORDER BY created_at DESC");
    return rows.map(senaryoFromRow);
  },
  get: async (id: string): Promise<Senaryo | undefined> => {
    const { rows } = await pool.query("SELECT * FROM scenarios WHERE id = $1", [id]);
    return rows[0] ? senaryoFromRow(rows[0]) : undefined;
  },
  create: async (data: Omit<Senaryo, "id" | "created_at">): Promise<Senaryo> => {
    const id = randomUUID();
    const { rows } = await pool.query(
      `INSERT INTO scenarios (id, ad, yon, sistem_promptu, karsilama_mesaji, kurallar, toplanacak_degiskenler, aktif)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [
        id,
        data.ad,
        data.yon,
        data.sistem_promptu,
        data.karsilama_mesaji,
        JSON.stringify(data.kurallar),
        JSON.stringify(data.toplanacak_degiskenler),
        data.aktif,
      ],
    );
    return senaryoFromRow(rows[0]);
  },
  update: async (id: string, patch: Partial<Senaryo>): Promise<Senaryo | undefined> => {
    const mevcut = await senaryoRepo.get(id);
    if (!mevcut) return undefined;
    const birlesik = { ...mevcut, ...patch };
    const { rows } = await pool.query(
      `UPDATE scenarios SET ad = $2, yon = $3, sistem_promptu = $4, karsilama_mesaji = $5,
         kurallar = $6, toplanacak_degiskenler = $7, aktif = $8
       WHERE id = $1 RETURNING *`,
      [
        id,
        birlesik.ad,
        birlesik.yon,
        birlesik.sistem_promptu,
        birlesik.karsilama_mesaji,
        JSON.stringify(birlesik.kurallar),
        JSON.stringify(birlesik.toplanacak_degiskenler),
        birlesik.aktif,
      ],
    );
    return senaryoFromRow(rows[0]);
  },
  remove: async (id: string): Promise<void> => {
    await pool.query("DELETE FROM scenarios WHERE id = $1", [id]);
  },
};

function aramaFromRow(row: Record<string, unknown>): Arama {
  return {
    id: row.id as string,
    scenario_id: row.scenario_id as string,
    yon: row.yon as Arama["yon"],
    mod: row.mod as Arama["mod"],
    karsi_taraf: row.karsi_taraf as string,
    durum: row.durum as Arama["durum"],
    sonuc: (row.sonuc as Arama["sonuc"]) ?? undefined,
    kullanim: row.kullanim as Arama["kullanim"],
    started_at: (row.started_at as Date).toISOString(),
    ended_at: row.ended_at ? (row.ended_at as Date).toISOString() : undefined,
  };
}

export const aramaRepo = {
  list: async (): Promise<Arama[]> => {
    const { rows } = await pool.query("SELECT * FROM calls ORDER BY started_at DESC");
    return rows.map(aramaFromRow);
  },
  get: async (id: string): Promise<Arama | undefined> => {
    const { rows } = await pool.query("SELECT * FROM calls WHERE id = $1", [id]);
    return rows[0] ? aramaFromRow(rows[0]) : undefined;
  },
  create: async (data: Omit<Arama, "id" | "started_at" | "kullanim">): Promise<Arama> => {
    const id = randomUUID();
    const kullanimBaslangic = { stt_cagri: 0, llm_cagri: 0, tts_cagri: 0, tahmini_token: 0 };
    const { rows } = await pool.query(
      `INSERT INTO calls (id, scenario_id, yon, mod, karsi_taraf, durum, kullanim)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [id, data.scenario_id, data.yon, data.mod, data.karsi_taraf, data.durum, JSON.stringify(kullanimBaslangic)],
    );
    return aramaFromRow(rows[0]);
  },
  update: async (id: string, patch: Partial<Arama>): Promise<Arama | undefined> => {
    const mevcut = await aramaRepo.get(id);
    if (!mevcut) return undefined;
    const birlesik = { ...mevcut, ...patch };
    const { rows } = await pool.query(
      `UPDATE calls SET durum = $2, sonuc = $3, kullanim = $4, ended_at = $5
       WHERE id = $1 RETURNING *`,
      [
        id,
        birlesik.durum,
        birlesik.sonuc ? JSON.stringify(birlesik.sonuc) : null,
        JSON.stringify(birlesik.kullanim),
        birlesik.ended_at ?? null,
      ],
    );
    return aramaFromRow(rows[0]);
  },
  turns: async (callId: string): Promise<AramaTuru[]> => {
    const { rows } = await pool.query("SELECT * FROM call_turns WHERE call_id = $1 ORDER BY ts ASC", [callId]);
    return rows.map((row) => ({
      id: row.id,
      call_id: row.call_id,
      konusmaci: row.konusmaci,
      metin: row.metin,
      ses_url: row.ses_url ?? undefined,
      ts: (row.ts as Date).toISOString(),
    }));
  },
  addTurn: async (data: Omit<AramaTuru, "id" | "ts">): Promise<AramaTuru> => {
    const id = randomUUID();
    const { rows } = await pool.query(
      `INSERT INTO call_turns (id, call_id, konusmaci, metin, ses_url) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [id, data.call_id, data.konusmaci, data.metin, data.ses_url ?? null],
    );
    const row = rows[0];
    return {
      id: row.id,
      call_id: row.call_id,
      konusmaci: row.konusmaci,
      metin: row.metin,
      ses_url: row.ses_url ?? undefined,
      ts: (row.ts as Date).toISOString(),
    };
  },
};

function settingsFromRow(row: Record<string, unknown>): Settings {
  return {
    hf_token: (row.hf_token as string) ?? undefined,
    hf_llm_model: row.hf_llm_model as string,
    hf_stt_model: row.hf_stt_model as string,
    elevenlabs_api_key: (row.elevenlabs_api_key as string) ?? undefined,
    elevenlabs_voice_id: row.elevenlabs_voice_id as string,
    mod: row.mod as Settings["mod"],
    max_tur: row.max_tur as number,
    twilio_account_sid: (row.twilio_account_sid as string) ?? undefined,
    twilio_auth_token: (row.twilio_auth_token as string) ?? undefined,
    twilio_phone_number: (row.twilio_phone_number as string) ?? undefined,
  };
}

export const settingsRepo = {
  get: async (): Promise<Settings> => {
    const { rows } = await pool.query("SELECT * FROM settings WHERE id = 1");
    return settingsFromRow(rows[0]);
  },
  update: async (patch: Partial<Settings>): Promise<Settings> => {
    const mevcut = await settingsRepo.get();
    const birlesik = { ...mevcut, ...patch };
    const { rows } = await pool.query(
      `UPDATE settings SET hf_token = $1, hf_llm_model = $2, hf_stt_model = $3,
         elevenlabs_api_key = $4, elevenlabs_voice_id = $5, mod = $6, max_tur = $7,
         twilio_account_sid = $8, twilio_auth_token = $9, twilio_phone_number = $10
       WHERE id = 1 RETURNING *`,
      [
        birlesik.hf_token ?? null,
        birlesik.hf_llm_model,
        birlesik.hf_stt_model,
        birlesik.elevenlabs_api_key ?? null,
        birlesik.elevenlabs_voice_id,
        birlesik.mod,
        birlesik.max_tur,
        birlesik.twilio_account_sid ?? null,
        birlesik.twilio_auth_token ?? null,
        birlesik.twilio_phone_number ?? null,
      ],
    );
    return settingsFromRow(rows[0]);
  },
};
