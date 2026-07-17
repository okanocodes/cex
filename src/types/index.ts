export type SenaryoYon = "giden" | "gelen" | "her_ikisi";

export type KuralEylem = "devam" | "degisken_kaydet" | "sonlandir" | "ozel_yanit";

export interface SenaryoKural {
  id: string;
  anahtar_kelimeler: string[];
  eylem: KuralEylem;
  parametreler?: {
    degisken_adi?: string;
    ozel_yanit_metni?: string;
  };
}

export interface Senaryo {
  id: string;
  ad: string;
  yon: SenaryoYon;
  sistem_promptu: string;
  karsilama_mesaji: string;
  kurallar: SenaryoKural[];
  toplanacak_degiskenler: string[];
  aktif: boolean;
  created_at: string;
}

export type AramaYon = "giden" | "gelen";
export type AramaMod = "simulasyon" | "twilio";
export type AramaDurum = "beklemede" | "devam_ediyor" | "tamamlandi" | "basarisiz";

export interface AramaKullanim {
  stt_cagri: number;
  llm_cagri: number;
  tts_cagri: number;
  tahmini_token: number;
}

export interface Arama {
  id: string;
  scenario_id: string;
  yon: AramaYon;
  mod: AramaMod;
  karsi_taraf: string;
  durum: AramaDurum;
  sonuc?: {
    degiskenler: Record<string, string>;
    etiket?: string;
  };
  kullanim: AramaKullanim;
  started_at: string;
  ended_at?: string;
}

export type Konusmaci = "ai" | "kullanici";

export interface AramaTuru {
  id: string;
  call_id: string;
  konusmaci: Konusmaci;
  metin: string;
  ses_url?: string;
  ts: string;
}

export interface Ayarlar {
  hf_token_ayarli: boolean;
  hf_llm_model: string;
  hf_stt_model: string;
  elevenlabs_ayarli: boolean;
  elevenlabs_voice_id: string;
  mod: AramaMod;
  max_tur: number;
  twilio_ayarli: boolean;
  twilio_account_sid?: string;
  twilio_phone_number?: string;
}
