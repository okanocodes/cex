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

export default function Panel() {
  const senaryolar = useQuery({ queryKey: ["senaryolar"], queryFn: api.senaryolar.list });
  const aramalar = useQuery({ queryKey: ["aramalar"], queryFn: api.aramalar.list });

  if (senaryolar.isLoading || aramalar.isLoading) return <Spinner label="Panel yükleniyor..." />;
  if (senaryolar.isError) return <ErrorState message={(senaryolar.error as Error).message} />;
  if (aramalar.isError) return <ErrorState message={(aramalar.error as Error).message} />;

  const tumAramalar = aramalar.data ?? [];
  const aktifSenaryoSayisi = (senaryolar.data ?? []).filter((s) => s.aktif).length;
  const tamamlanan = tumAramalar.filter((c) => c.durum === "tamamlandi").length;
  const basariOrani = tumAramalar.length ? Math.round((tamamlanan / tumAramalar.length) * 100) : 0;
  const sonAramalar = [...tumAramalar]
    .sort((a, b) => (a.started_at < b.started_at ? 1 : -1))
    .slice(0, 5);

  return (
    <div>
      <PageHeader
        title="Panel"
        description="Çağrı platformunuzun genel durumu"
        action={
          <Link to="/arama-baslat">
            <button className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500">
              + Arama Başlat
            </button>
          </Link>
        }
      />
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-sm text-slate-400">Toplam Çağrı</p>
          <p className="mt-2 text-3xl font-semibold text-white">{tumAramalar.length}</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-400">Aktif Senaryo</p>
          <p className="mt-2 text-3xl font-semibold text-white">{aktifSenaryoSayisi}</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-400">Başarı Oranı</p>
          <p className="mt-2 text-3xl font-semibold text-white">%{basariOrani}</p>
        </Card>
      </div>

      <h2 className="mb-3 text-lg font-medium text-white">Son Çağrılar</h2>
      {sonAramalar.length === 0 ? (
        <EmptyState
          title="Henüz çağrı yok"
          description="Bir senaryo oluşturup ilk test aramanızı başlatın."
          action={
            <Link to="/arama-baslat" className="text-sm font-medium text-indigo-400 hover:text-indigo-300">
              Arama Başlat →
            </Link>
          }
        />
      ) : (
        <Card className="divide-y divide-slate-800 p-0">
          {sonAramalar.map((c) => (
            <Link
              key={c.id}
              to={`/aramalar/${c.id}`}
              className="flex items-center justify-between px-5 py-3 text-sm hover:bg-slate-800/50"
            >
              <div>
                <p className="font-medium text-slate-100">{c.karsi_taraf}</p>
                <p className="text-xs text-slate-500">{new Date(c.started_at).toLocaleString("tr-TR")}</p>
              </div>
              <Badge tone={DURUM_TON[c.durum]}>{DURUM_ETIKET[c.durum]}</Badge>
            </Link>
          ))}
        </Card>
      )}
    </div>
  );
}
