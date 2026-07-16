import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { Badge, Card, EmptyState, ErrorState, PageHeader, Spinner } from "../components/ui";
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

export default function Aramalar() {
  const aramalar = useQuery({ queryKey: ["aramalar"], queryFn: api.aramalar.list });

  if (aramalar.isLoading) return <Spinner label="Çağrılar yükleniyor..." />;
  if (aramalar.isError) return <ErrorState message={(aramalar.error as Error).message} />;

  const veriler = [...(aramalar.data ?? [])].sort((a, b) => (a.started_at < b.started_at ? 1 : -1));

  return (
    <div>
      <PageHeader title="Arama Günlükleri" description="Geçmiş çağrıların transkript ve sonuçları" />
      {veriler.length === 0 ? (
        <EmptyState title="Henüz çağrı kaydı yok" description="Arama Başlat sayfasından bir test araması yapın." />
      ) : (
        <Card className="divide-y divide-slate-800 p-0">
          {veriler.map((c) => (
            <Link
              key={c.id}
              to={`/aramalar/${c.id}`}
              className="flex items-center justify-between px-5 py-4 text-sm hover:bg-slate-800/50"
            >
              <div>
                <p className="font-medium text-slate-100">{c.karsi_taraf}</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {c.yon === "giden" ? "Giden" : "Gelen"} · {c.mod === "simulasyon" ? "Simülasyon" : "Twilio"} ·{" "}
                  {new Date(c.started_at).toLocaleString("tr-TR")}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {c.sonuc?.etiket && <span className="text-xs text-slate-400">{c.sonuc.etiket}</span>}
                <Badge tone={DURUM_TON[c.durum]}>{DURUM_ETIKET[c.durum]}</Badge>
              </div>
            </Link>
          ))}
        </Card>
      )}
    </div>
  );
}
