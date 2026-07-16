import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { api } from "../lib/api";
import { Badge, Card, ErrorState, PageHeader, Spinner } from "../components/ui";
import type { AramaDurum } from "../types";

const DURUM_TON: Record<AramaDurum, "slate" | "green" | "red" | "amber"> = {
  beklemede: "slate",
  devam_ediyor: "amber",
  tamamlandi: "green",
  basarisiz: "red",
};

const DURUM_ETIKET: Record<AramaDurum, string> = {
  beklemede: "Beklemede",
  devam_ediyor: "Devam Ediyor",
  tamamlandi: "Tamamlandı",
  basarisiz: "Başarısız",
};

export default function AramaDetay() {
  const { id } = useParams();
  const arama = useQuery({ queryKey: ["arama", id], queryFn: () => api.aramalar.get(id!) });
  const turlar = useQuery({ queryKey: ["arama-turlari", id], queryFn: () => api.aramalar.turns(id!) });

  if (arama.isLoading || turlar.isLoading) return <Spinner label="Çağrı yükleniyor..." />;
  if (arama.isError) return <ErrorState message={(arama.error as Error).message} />;
  if (turlar.isError) return <ErrorState message={(turlar.error as Error).message} />;

  const c = arama.data!;
  const degiskenler = Object.entries(c.sonuc?.degiskenler ?? {});

  return (
    <div className="max-w-3xl">
      <PageHeader
        title={c.karsi_taraf}
        description={`${c.yon === "giden" ? "Giden" : "Gelen"} çağrı · ${new Date(c.started_at).toLocaleString("tr-TR")}`}
        action={<Badge tone={DURUM_TON[c.durum]}>{DURUM_ETIKET[c.durum]}</Badge>}
      />

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <p className="text-xs text-slate-400">STT Çağrısı</p>
          <p className="mt-1 text-xl font-semibold text-white">{c.kullanim.stt_cagri}</p>
        </Card>
        <Card>
          <p className="text-xs text-slate-400">LLM Çağrısı</p>
          <p className="mt-1 text-xl font-semibold text-white">{c.kullanim.llm_cagri}</p>
        </Card>
        <Card>
          <p className="text-xs text-slate-400">TTS Çağrısı</p>
          <p className="mt-1 text-xl font-semibold text-white">{c.kullanim.tts_cagri}</p>
        </Card>
        <Card>
          <p className="text-xs text-slate-400">Tahmini Token</p>
          <p className="mt-1 text-xl font-semibold text-white">{c.kullanim.tahmini_token}</p>
        </Card>
      </div>

      {degiskenler.length > 0 && (
        <Card className="mb-6">
          <p className="mb-3 font-medium text-white">Toplanan Bilgiler</p>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            {degiskenler.map(([anahtar, deger]) => (
              <div key={anahtar}>
                <dt className="text-xs text-slate-500">{anahtar}</dt>
                <dd className="text-slate-200">{deger}</dd>
              </div>
            ))}
          </dl>
        </Card>
      )}

      <p className="mb-3 font-medium text-white">Transkript</p>
      <div className="flex flex-col gap-3">
        {(turlar.data ?? []).map((t) => (
          <div key={t.id} className={`flex ${t.konusmaci === "ai" ? "justify-start" : "justify-end"}`}>
            <div
              className={`max-w-md rounded-xl px-4 py-2 text-sm ${
                t.konusmaci === "ai" ? "bg-slate-800 text-slate-100" : "bg-indigo-600 text-white"
              }`}
            >
              <p className="mb-1 text-[10px] uppercase tracking-wide opacity-60">
                {t.konusmaci === "ai" ? "AI" : "Kullanıcı"}
              </p>
              <p>{t.metin}</p>
              {t.ses_url && <audio className="mt-2 w-full" controls src={t.ses_url} />}
            </div>
          </div>
        ))}
        {(turlar.data ?? []).length === 0 && <p className="text-sm text-slate-500">Bu çağrı için transkript yok.</p>}
      </div>
    </div>
  );
}
