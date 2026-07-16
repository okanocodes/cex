import { randomUUID } from "node:crypto";
import { db } from "./store.js";
import type { Arama, AramaTuru, Senaryo, Settings } from "../types.js";

export const senaryoRepo = {
  list: () => db.data.scenarios,
  get: (id: string) => db.data.scenarios.find((s) => s.id === id),
  create: async (data: Omit<Senaryo, "id" | "created_at">) => {
    const senaryo: Senaryo = { ...data, id: randomUUID(), created_at: new Date().toISOString() };
    db.data.scenarios.push(senaryo);
    await db.write();
    return senaryo;
  },
  update: async (id: string, patch: Partial<Senaryo>) => {
    const senaryo = db.data.scenarios.find((s) => s.id === id);
    if (!senaryo) return undefined;
    Object.assign(senaryo, patch);
    await db.write();
    return senaryo;
  },
  remove: async (id: string) => {
    db.data.scenarios = db.data.scenarios.filter((s) => s.id !== id);
    await db.write();
  },
};

export const aramaRepo = {
  list: () => db.data.calls,
  get: (id: string) => db.data.calls.find((c) => c.id === id),
  create: async (data: Omit<Arama, "id" | "started_at" | "kullanim">) => {
    const arama: Arama = {
      ...data,
      id: randomUUID(),
      started_at: new Date().toISOString(),
      kullanim: { stt_cagri: 0, llm_cagri: 0, tts_cagri: 0, tahmini_token: 0 },
    };
    db.data.calls.push(arama);
    await db.write();
    return arama;
  },
  update: async (id: string, patch: Partial<Arama>) => {
    const arama = db.data.calls.find((c) => c.id === id);
    if (!arama) return undefined;
    Object.assign(arama, patch);
    await db.write();
    return arama;
  },
  turns: (callId: string) => db.data.call_turns.filter((t) => t.call_id === callId),
  addTurn: async (data: Omit<AramaTuru, "id" | "ts">) => {
    const tur: AramaTuru = { ...data, id: randomUUID(), ts: new Date().toISOString() };
    db.data.call_turns.push(tur);
    await db.write();
    return tur;
  },
};

export const settingsRepo = {
  get: (): Settings => db.data.settings,
  update: async (patch: Partial<Settings>) => {
    Object.assign(db.data.settings, patch);
    await db.write();
    return db.data.settings;
  },
};
