import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { blobToBase64, CallSocket, type SunucuMesaj } from "../lib/ws";
import { Button, Card, ErrorState, Label, PageHeader, Select, Spinner } from "../components/ui";
import type { AramaYon } from "../types";

interface EkranTuru {
  konusmaci: "ai" | "kullanici";
  metin: string;
}

export default function AramaBaslat() {
  const senaryolar = useQuery({ queryKey: ["senaryolar"], queryFn: api.senaryolar.list });

  const [senaryoId, setSenaryoId] = useState("");
  const [yon, setYon] = useState<AramaYon>("giden");
  const [callId, setCallId] = useState<string | null>(null);
  const [turlar, setTurlar] = useState<EkranTuru[]>([]);
  const [durum, setDurum] = useState<"hazir" | "baslatiliyor" | "aktif" | "isleniyor" | "bitti" | "hata">("hazir");
  const [kayitYapiliyor, setKayitYapiliyor] = useState(false);
  const [hataMesaji, setHataMesaji] = useState<string | null>(null);
  const [sonuc, setSonuc] = useState<{ degiskenler: Record<string, string>; etiket?: string } | null>(null);

  const socketRef = useRef<CallSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    return () => socketRef.current?.kapat();
  }, []);

  const mesajGeldi = (msg: SunucuMesaj) => {
    if (msg.type === "ai_turu") {
      setTurlar((t) => [...t, { konusmaci: "ai", metin: msg.metin }]);
      setDurum("aktif");
      if (msg.audio_base64) {
        const audio = new Audio(`data:${msg.mime ?? "audio/mpeg"};base64,${msg.audio_base64}`);
        audio.play().catch(() => {
          // Autoplay may be blocked until the user interacts with the page; not fatal.
        });
      }
    } else if (msg.type === "kullanici_turu") {
      setTurlar((t) => [...t, { konusmaci: "kullanici", metin: msg.metin }]);
    } else if (msg.type === "kullanici_turu_isleniyor") {
      setDurum("isleniyor");
    } else if (msg.type === "arama_bitti") {
      setSonuc(msg.sonuc);
      setDurum("bitti");
    } else if (msg.type === "hata") {
      setHataMesaji(msg.mesaj);
      setDurum("hata");
    }
  };

  const aramayiBaslat = async () => {
    setHataMesaji(null);
    setDurum("baslatiliyor");
    try {
      const arama = await api.aramalar.start({ scenario_id: senaryoId, yon });
      setCallId(arama.id);
      setTurlar([]);
      setSonuc(null);
      const socket = new CallSocket(arama.id, mesajGeldi, () => {
        setDurum((d) => (d === "bitti" ? d : "hata"));
      });
      socketRef.current = socket;
      socket.baslat();
    } catch (e) {
      setHataMesaji((e as Error).message);
      setDurum("hata");
    }
  };

  const kayitBaslat = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: recorder.mimeType });
        // Silence gate: skip near-empty clips so we don't waste an STT call.
        if (blob.size < 2000) return;
        const base64 = await blobToBase64(blob);
        setDurum("isleniyor");
        socketRef.current?.sesGonder(base64, recorder.mimeType);
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setKayitYapiliyor(true);
    } catch {
      setHataMesaji("Mikrofona erişilemedi. Tarayıcı izinlerini kontrol edin.");
      setDurum("hata");
    }
  };

  const kayitBitir = () => {
    mediaRecorderRef.current?.stop();
    setKayitYapiliyor(false);
  };

  const aramayiSonlandir = () => {
    socketRef.current?.sonlandir();
  };

  const senaryo = senaryolar.data?.find((s) => s.id === senaryoId);

  return (
    <div className="max-w-2xl">
      <PageHeader title="Arama Başlat" description="Bir senaryo seçip AI ile test araması yapın (tarayıcı simülasyonu)" />

      {!callId && (
        <Card className="flex flex-col gap-4">
          {senaryolar.isLoading && <Spinner label="Senaryolar yükleniyor..." />}
          {senaryolar.isError && <ErrorState message={(senaryolar.error as Error).message} />}
          {senaryolar.data && senaryolar.data.length === 0 && (
            <p className="text-sm text-slate-400">
              Önce Senaryolar sayfasından bir senaryo oluşturmanız gerekiyor.
            </p>
          )}
          {senaryolar.data && senaryolar.data.length > 0 && (
            <>
              <div>
                <Label>Senaryo</Label>
                <Select value={senaryoId} onChange={(e) => setSenaryoId(e.target.value)}>
                  <option value="">Seçiniz...</option>
                  {senaryolar.data
                    .filter((s) => s.aktif)
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.ad}
                      </option>
                    ))}
                </Select>
              </div>
              <div>
                <Label>Yön</Label>
                <Select value={yon} onChange={(e) => setYon(e.target.value as AramaYon)}>
                  <option value="giden">Giden Test Araması (AI arar)</option>
                  <option value="gelen">Gelen Arama Simülasyonu (AI cevaplar)</option>
                </Select>
              </div>
              <Button disabled={!senaryoId || durum === "baslatiliyor"} onClick={aramayiBaslat}>
                {durum === "baslatiliyor" ? "Başlatılıyor..." : "Aramayı Başlat"}
              </Button>
            </>
          )}
        </Card>
      )}

      {hataMesaji && <ErrorState message={hataMesaji} />}

      {callId && (
        <div className="mt-6 flex flex-col gap-4">
          <Card>
            <p className="text-xs text-slate-500">{senaryo?.ad}</p>
            <div className="mt-3 flex max-h-96 flex-col gap-3 overflow-y-auto">
              {turlar.map((t, i) => (
                <div key={i} className={`flex ${t.konusmaci === "ai" ? "justify-start" : "justify-end"}`}>
                  <div
                    className={`max-w-md rounded-xl px-4 py-2 text-sm ${
                      t.konusmaci === "ai" ? "bg-slate-800 text-slate-100" : "bg-indigo-600 text-white"
                    }`}
                  >
                    {t.metin}
                  </div>
                </div>
              ))}
              {durum === "isleniyor" && <Spinner label="AI düşünüyor..." />}
            </div>
          </Card>

          {durum !== "bitti" ? (
            <div className="flex items-center gap-3">
              <button
                onMouseDown={kayitBaslat}
                onMouseUp={kayitBitir}
                onTouchStart={kayitBaslat}
                onTouchEnd={kayitBitir}
                disabled={durum === "isleniyor" || durum === "baslatiliyor"}
                className={`flex-1 rounded-lg py-4 text-sm font-medium disabled:opacity-50 ${
                  kayitYapiliyor ? "bg-red-600 text-white" : "bg-indigo-600 text-white hover:bg-indigo-500"
                }`}
              >
                {kayitYapiliyor ? "Kayıt yapılıyor... (bırakınca gönderilir)" : "Basılı Tutup Konuşun"}
              </button>
              <Button variant="secondary" onClick={aramayiSonlandir}>
                Aramayı Bitir
              </Button>
            </div>
          ) : (
            <Card>
              <p className="font-medium text-white">Arama Tamamlandı</p>
              {sonuc?.etiket && <p className="mt-1 text-sm text-slate-400">Sonuç: {sonuc.etiket}</p>}
              {sonuc && Object.keys(sonuc.degiskenler).length > 0 && (
                <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  {Object.entries(sonuc.degiskenler).map(([k, v]) => (
                    <div key={k}>
                      <dt className="text-xs text-slate-500">{k}</dt>
                      <dd className="text-slate-200">{v}</dd>
                    </div>
                  ))}
                </dl>
              )}
              <Button
                className="mt-4"
                onClick={() => {
                  setCallId(null);
                  setTurlar([]);
                  setDurum("hazir");
                }}
              >
                Yeni Arama Başlat
              </Button>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
