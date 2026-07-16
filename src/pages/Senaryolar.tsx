import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { Badge, Button, Card, EmptyState, ErrorState, PageHeader, Spinner } from "../components/ui";

const YON_ETIKET: Record<string, string> = {
  giden: "Giden",
  gelen: "Gelen",
  her_ikisi: "Her İkisi",
};

export default function Senaryolar() {
  const queryClient = useQueryClient();
  const senaryolar = useQuery({ queryKey: ["senaryolar"], queryFn: api.senaryolar.list });

  const sil = useMutation({
    mutationFn: (id: string) => api.senaryolar.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["senaryolar"] }),
  });

  if (senaryolar.isLoading) return <Spinner label="Senaryolar yükleniyor..." />;
  if (senaryolar.isError) return <ErrorState message={(senaryolar.error as Error).message} />;

  const veriler = senaryolar.data ?? [];

  return (
    <div>
      <PageHeader
        title="Senaryolar"
        description="Aramaları yönlendiren kural setlerini oluşturun ve yönetin"
        action={
          <Link to="/senaryolar/yeni">
            <Button>+ Yeni Senaryo</Button>
          </Link>
        }
      />
      {veriler.length === 0 ? (
        <EmptyState
          title="Henüz senaryo yok"
          description="AI'ın bir çağrıda nasıl davranacağını tanımlamak için ilk senaryonuzu oluşturun."
          action={
            <Link to="/senaryolar/yeni" className="text-sm font-medium text-indigo-400 hover:text-indigo-300">
              Senaryo Oluştur →
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {veriler.map((s) => (
            <Card key={s.id} className="flex flex-col gap-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-white">{s.ad}</p>
                  <p className="mt-1 text-xs text-slate-500">{YON_ETIKET[s.yon]}</p>
                </div>
                <Badge tone={s.aktif ? "green" : "slate"}>{s.aktif ? "Aktif" : "Pasif"}</Badge>
              </div>
              <p className="line-clamp-2 text-sm text-slate-400">{s.sistem_promptu}</p>
              <p className="text-xs text-slate-500">{s.kurallar.length} kural tanımlı</p>
              <div className="mt-auto flex gap-2 pt-2">
                <Link to={`/senaryolar/${s.id}`} className="flex-1">
                  <Button variant="secondary" className="w-full">
                    Düzenle
                  </Button>
                </Link>
                <Button
                  variant="danger"
                  onClick={() => {
                    if (confirm(`"${s.ad}" senaryosunu silmek istediğinize emin misiniz?`)) {
                      sil.mutate(s.id);
                    }
                  }}
                >
                  Sil
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
