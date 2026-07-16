import type { Arama, AramaTuru, Ayarlar, Senaryo } from "../types";

const BASE = "/api";

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`İstek başarısız (${res.status}): ${body || res.statusText}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  senaryolar: {
    list: () => req<Senaryo[]>("/scenarios"),
    get: (id: string) => req<Senaryo>(`/scenarios/${id}`),
    create: (data: Partial<Senaryo>) =>
      req<Senaryo>("/scenarios", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: Partial<Senaryo>) =>
      req<Senaryo>(`/scenarios/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    remove: (id: string) => req<void>(`/scenarios/${id}`, { method: "DELETE" }),
  },
  aramalar: {
    list: () => req<Arama[]>("/calls"),
    get: (id: string) => req<Arama>(`/calls/${id}`),
    turns: (id: string) => req<AramaTuru[]>(`/calls/${id}/turns`),
    start: (data: { scenario_id: string; yon: "giden" | "gelen" }) =>
      req<Arama>("/calls", { method: "POST", body: JSON.stringify(data) }),
  },
  ayarlar: {
    get: () => req<Ayarlar>("/settings"),
    update: (data: Partial<Ayarlar> & { hf_token?: string; twilio_auth_token?: string }) =>
      req<Ayarlar>("/settings", { method: "PUT", body: JSON.stringify(data) }),
  },
};
