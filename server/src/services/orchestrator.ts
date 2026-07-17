import { generateReply, transcribeAudio, type SohbetTuru } from "./huggingface.js";
import { synthesizeSpeech } from "./elevenlabs.js";
import { kuralEslestir } from "./ruleEngine.js";
import { aramaRepo, senaryoRepo, settingsRepo } from "../db/repo.js";
import type { Arama, Senaryo } from "../types.js";

// Cost control: only the last N turns are sent to the LLM each time, so prompt size
// (and billed input) stays flat instead of growing with call length.
const GECMIS_PENCERESI = 6;
const VARSAYILAN_KAPANIS = "Görüşme için teşekkür ederim, iyi günler dilerim.";

export interface SesYaniti {
  buffer: Buffer;
  mime: string;
}

export interface AiTurSonucu {
  metin: string;
  ses: SesYaniti;
}

export interface TurSonucu {
  kullaniciMetni: string;
  ai: AiTurSonucu;
  bitti: boolean;
  sonuc?: { degiskenler: Record<string, string>; etiket?: string };
}

function tokenTahminEt(...metinler: string[]): number {
  const toplamKarakter = metinler.reduce((acc, m) => acc + m.length, 0);
  return Math.ceil(toplamKarakter / 4);
}

export async function karsilamayiGonder(arama: Arama, senaryo: Senaryo): Promise<AiTurSonucu> {
  const ses = await synthesizeSpeech(senaryo.karsilama_mesaji);
  await aramaRepo.update(arama.id, {
    kullanim: { ...arama.kullanim, tts_cagri: arama.kullanim.tts_cagri + 1 },
  });
  await aramaRepo.addTurn({ call_id: arama.id, konusmaci: "ai", metin: senaryo.karsilama_mesaji });
  return { metin: senaryo.karsilama_mesaji, ses };
}

export async function turIsle(aramaId: string, audio: Buffer, mime: string): Promise<TurSonucu> {
  const arama = await aramaRepo.get(aramaId);
  if (!arama) throw new Error("Arama bulunamadı.");
  const senaryo = await senaryoRepo.get(arama.scenario_id);
  if (!senaryo) throw new Error("Senaryo bulunamadı.");
  const settings = await settingsRepo.get();

  const kullaniciMetni = await transcribeAudio(audio, mime);
  await aramaRepo.addTurn({ call_id: arama.id, konusmaci: "kullanici", metin: kullaniciMetni });

  // Persisted immediately so a later LLM/TTS failure this turn doesn't lose the STT
  // usage count — without this, a mid-turn error left completed API calls unaccounted for.
  const kullanim = { ...arama.kullanim, stt_cagri: arama.kullanim.stt_cagri + 1 };
  await aramaRepo.update(aramaId, { kullanim });

  const degiskenler = { ...(arama.sonuc?.degiskenler ?? {}) };
  const tumTurlar = await aramaRepo.turns(aramaId);
  const kullaniciTurSayisi = tumTurlar.filter((t) => t.konusmaci === "kullanici").length;

  let aiMetin: string;
  let bitti: boolean;
  let etiket: string | undefined;

  try {
    if (kullaniciTurSayisi >= settings.max_tur) {
      // Turn cap hit: bounded, scripted close — no LLM call spent.
      aiMetin = VARSAYILAN_KAPANIS;
      bitti = true;
      etiket = "Maksimum tur sayısına ulaşıldı";
    } else {
      const kural = kuralEslestir(senaryo, kullaniciMetni);

      if (kural?.eylem === "sonlandir") {
        aiMetin = kural.parametreler?.ozel_yanit_metni || VARSAYILAN_KAPANIS;
        bitti = true;
        etiket = "Kural ile sonlandırıldı";
      } else if (kural?.eylem === "ozel_yanit") {
        // Deterministic branch — skip the LLM call entirely.
        aiMetin = kural.parametreler?.ozel_yanit_metni || "Anladım.";
        bitti = false;
      } else {
        if (kural?.eylem === "degisken_kaydet" && kural.parametreler?.degisken_adi) {
          degiskenler[kural.parametreler.degisken_adi] = kullaniciMetni;
        }
        const gecmis = tumTurlar
          .slice(-GECMIS_PENCERESI)
          .map<SohbetTuru>((t) => ({ role: t.konusmaci === "ai" ? "assistant" : "user", content: t.metin }));
        const llmYanit = await generateReply(senaryo.sistem_promptu, senaryo.toplanacak_degiskenler, gecmis);
        kullanim.llm_cagri += 1;
        kullanim.tahmini_token += tokenTahminEt(senaryo.sistem_promptu, ...gecmis.map((g) => g.content), llmYanit.yanit);
        Object.assign(degiskenler, llmYanit.degiskenler);
        aiMetin = llmYanit.yanit;
        bitti = llmYanit.durum === "sonlandir";
      }
    }
    const ses = await synthesizeSpeech(aiMetin);
    kullanim.tts_cagri += 1;
    await aramaRepo.addTurn({ call_id: arama.id, konusmaci: "ai", metin: aiMetin });

    const sonuc = { degiskenler, etiket };
    await aramaRepo.update(aramaId, {
      kullanim,
      sonuc,
      durum: bitti ? "tamamlandi" : "devam_ediyor",
      ended_at: bitti ? new Date().toISOString() : undefined,
    });

    return { kullaniciMetni, ai: { metin: aiMetin, ses }, bitti, sonuc: bitti ? sonuc : undefined };
  } catch (err) {
    // Whatever usage was already accrued (STT, possibly LLM) stays recorded; the call
    // is marked failed instead of being left stuck in "devam_ediyor" forever.
    await aramaRepo.update(aramaId, { kullanim, durum: "basarisiz", ended_at: new Date().toISOString() });
    throw err;
  }
}

export async function aramayiElleSonlandir(aramaId: string) {
  const arama = await aramaRepo.get(aramaId);
  if (!arama) throw new Error("Arama bulunamadı.");
  const sonuc = { degiskenler: arama.sonuc?.degiskenler ?? {}, etiket: "Kullanıcı tarafından sonlandırıldı" };
  await aramaRepo.update(aramaId, { durum: "tamamlandi", ended_at: new Date().toISOString(), sonuc });
  return sonuc;
}
