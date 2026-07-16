import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../lib/api";
import { Button, Card, ErrorState, Input, Label, PageHeader, Select, Spinner, Textarea } from "../components/ui";
import type { KuralEylem, Senaryo, SenaryoKural, SenaryoYon } from "../types";

const bosSenaryo = (): Omit<Senaryo, "id" | "created_at"> => ({
  ad: "",
  yon: "her_ikisi",
  sistem_promptu:
    "Sen kibar ve yardımsever bir Türkçe konuşan çağrı asistanısın. Kısa ve net cümleler kur.",
  karsilama_mesaji: "Merhaba, ben yapay zeka asistanınızım. Size nasıl yardımcı olabilirim?",
  kurallar: [],
  toplanacak_degiskenler: [],
  aktif: true,
});

const yeniKural = (): SenaryoKural => ({
  id: crypto.randomUUID(),
  anahtar_kelimeler: [],
  eylem: "devam",
  parametreler: {},
});

const EYLEM_ETIKET: Record<KuralEylem, string> = {
  devam: "Devam Et (LLM'e bırak)",
  degisken_kaydet: "Değişken Kaydet",
  sonlandir: "Aramayı Sonlandır",
  ozel_yanit: "Özel Yanıt Ver (LLM çağrılmaz)",
};

export default function SenaryoDetay() {
  const { id } = useParams();
  const duzenlemeModu = Boolean(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const mevcut = useQuery({
    queryKey: ["senaryo", id],
    queryFn: () => api.senaryolar.get(id!),
    enabled: duzenlemeModu,
  });

  const [form, setForm] = useState<Omit<Senaryo, "id" | "created_at">>(bosSenaryo());
  const [degiskenlerMetin, setDegiskenlerMetin] = useState("");

  useEffect(() => {
    if (mevcut.data) {
      setForm(mevcut.data);
      setDegiskenlerMetin(mevcut.data.toplanacak_degiskenler.join(", "));
    }
  }, [mevcut.data]);

  const kaydet = useMutation({
    mutationFn: () => {
      const payload = { ...form, toplanacak_degiskenler: parcalaVirgul(degiskenlerMetin) };
      return duzenlemeModu ? api.senaryolar.update(id!, payload) : api.senaryolar.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["senaryolar"] });
      navigate("/senaryolar");
    },
  });

  if (duzenlemeModu && mevcut.isLoading) return <Spinner label="Senaryo yükleniyor..." />;
  if (duzenlemeModu && mevcut.isError) return <ErrorState message={(mevcut.error as Error).message} />;

  const kuralGuncelle = (index: number, patch: Partial<SenaryoKural>) => {
    setForm((f) => ({
      ...f,
      kurallar: f.kurallar.map((k, i) => (i === index ? { ...k, ...patch } : k)),
    }));
  };

  const kuralSil = (index: number) => {
    setForm((f) => ({ ...f, kurallar: f.kurallar.filter((_, i) => i !== index) }));
  };

  return (
    <div className="max-w-3xl">
      <PageHeader
        title={duzenlemeModu ? "Senaryoyu Düzenle" : "Yeni Senaryo"}
        description="AI'ın çağrı sırasında izleyeceği sistem talimatını ve kuralları tanımlayın"
      />

      <form
        className="flex flex-col gap-6"
        onSubmit={(e) => {
          e.preventDefault();
          kaydet.mutate();
        }}
      >
        <Card className="flex flex-col gap-4">
          <div>
            <Label>Senaryo Adı</Label>
            <Input
              required
              value={form.ad}
              onChange={(e) => setForm((f) => ({ ...f, ad: e.target.value }))}
              placeholder="Örn: Randevu Hatırlatma"
            />
          </div>
          <div>
            <Label>Yön</Label>
            <Select
              value={form.yon}
              onChange={(e) => setForm((f) => ({ ...f, yon: e.target.value as SenaryoYon }))}
            >
              <option value="giden">Giden Arama</option>
              <option value="gelen">Gelen Arama</option>
              <option value="her_ikisi">Her İkisi</option>
            </Select>
          </div>
          <div>
            <Label>Sistem Promptu (AI'ın rolü ve tonu)</Label>
            <Textarea
              required
              rows={4}
              value={form.sistem_promptu}
              onChange={(e) => setForm((f) => ({ ...f, sistem_promptu: e.target.value }))}
            />
          </div>
          <div>
            <Label>Karşılama Mesajı (AI'ın söyleyeceği ilk cümle)</Label>
            <Textarea
              required
              rows={2}
              value={form.karsilama_mesaji}
              onChange={(e) => setForm((f) => ({ ...f, karsilama_mesaji: e.target.value }))}
            />
          </div>
          <div>
            <Label>Toplanacak Değişkenler (virgülle ayırın)</Label>
            <Input
              value={degiskenlerMetin}
              onChange={(e) => setDegiskenlerMetin(e.target.value)}
              placeholder="Örn: musait_tarih, iptal_nedeni"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={form.aktif}
              onChange={(e) => setForm((f) => ({ ...f, aktif: e.target.checked }))}
            />
            Senaryo aktif
          </label>
        </Card>

        <Card className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-white">Kurallar</p>
              <p className="text-xs text-slate-400">
                Kullanıcı bir kuraldaki anahtar kelimeyi söylerse, o eylem LLM çağrısı yapılmadan devreye girer.
              </p>
            </div>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setForm((f) => ({ ...f, kurallar: [...f.kurallar, yeniKural()] }))}
            >
              + Kural Ekle
            </Button>
          </div>

          {form.kurallar.length === 0 && (
            <p className="text-sm text-slate-500">Henüz kural eklenmedi. Tüm konuşma LLM tarafından yönetilecek.</p>
          )}

          {form.kurallar.map((kural, index) => (
            <div key={kural.id} className="rounded-lg border border-slate-800 p-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <Label>Anahtar Kelimeler (virgülle ayırın)</Label>
                  <Input
                    value={kural.anahtar_kelimeler.join(", ")}
                    onChange={(e) => kuralGuncelle(index, { anahtar_kelimeler: parcalaVirgul(e.target.value) })}
                    placeholder="Örn: iptal, vazgeçtim"
                  />
                </div>
                <div>
                  <Label>Eylem</Label>
                  <Select
                    value={kural.eylem}
                    onChange={(e) => kuralGuncelle(index, { eylem: e.target.value as KuralEylem })}
                  >
                    {Object.entries(EYLEM_ETIKET).map(([deger, etiket]) => (
                      <option key={deger} value={deger}>
                        {etiket}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>

              {kural.eylem === "degisken_kaydet" && (
                <div className="mt-3">
                  <Label>Kaydedilecek Değişken Adı</Label>
                  <Input
                    value={kural.parametreler?.degisken_adi ?? ""}
                    onChange={(e) =>
                      kuralGuncelle(index, {
                        parametreler: { ...kural.parametreler, degisken_adi: e.target.value },
                      })
                    }
                  />
                </div>
              )}

              {(kural.eylem === "ozel_yanit" || kural.eylem === "sonlandir") && (
                <div className="mt-3">
                  <Label>{kural.eylem === "sonlandir" ? "Kapanış Mesajı (opsiyonel)" : "Özel Yanıt Metni"}</Label>
                  <Textarea
                    rows={2}
                    placeholder={
                      kural.eylem === "sonlandir" ? "Boş bırakılırsa varsayılan kapanış mesajı kullanılır." : undefined
                    }
                    value={kural.parametreler?.ozel_yanit_metni ?? ""}
                    onChange={(e) =>
                      kuralGuncelle(index, {
                        parametreler: { ...kural.parametreler, ozel_yanit_metni: e.target.value },
                      })
                    }
                  />
                </div>
              )}

              <div className="mt-3 text-right">
                <button
                  type="button"
                  onClick={() => kuralSil(index)}
                  className="text-xs font-medium text-red-400 hover:text-red-300"
                >
                  Kuralı Sil
                </button>
              </div>
            </div>
          ))}
        </Card>

        {kaydet.isError && <ErrorState message={(kaydet.error as Error).message} />}

        <div className="flex gap-3">
          <Button type="submit" disabled={kaydet.isPending}>
            {kaydet.isPending ? "Kaydediliyor..." : "Kaydet"}
          </Button>
          <Button type="button" variant="secondary" onClick={() => navigate("/senaryolar")}>
            Vazgeç
          </Button>
        </div>
      </form>
    </div>
  );
}

function parcalaVirgul(deger: string): string[] {
  return deger
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}
