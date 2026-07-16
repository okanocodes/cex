import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { Badge, Button, Card, ErrorState, Input, Label, PageHeader, Select, Spinner } from "../components/ui";
import type { AramaMod } from "../types";

export default function AyarlarSayfasi() {
  const queryClient = useQueryClient();
  const ayarlar = useQuery({ queryKey: ["ayarlar"], queryFn: api.ayarlar.get });

  const [hfToken, setHfToken] = useState("");
  const [llmModel, setLlmModel] = useState("");
  const [sttModel, setSttModel] = useState("");
  const [ttsModel, setTtsModel] = useState("");
  const [mod, setMod] = useState<AramaMod>("simulasyon");
  const [maxTur, setMaxTur] = useState(12);
  const [twilioSid, setTwilioSid] = useState("");
  const [twilioAuth, setTwilioAuth] = useState("");
  const [twilioNumara, setTwilioNumara] = useState("");

  useEffect(() => {
    if (ayarlar.data) {
      setLlmModel(ayarlar.data.hf_llm_model);
      setSttModel(ayarlar.data.hf_stt_model);
      setTtsModel(ayarlar.data.hf_tts_model);
      setMod(ayarlar.data.mod);
      setMaxTur(ayarlar.data.max_tur);
      setTwilioSid(ayarlar.data.twilio_account_sid ?? "");
      setTwilioNumara(ayarlar.data.twilio_phone_number ?? "");
    }
  }, [ayarlar.data]);

  const kaydet = useMutation({
    mutationFn: () =>
      api.ayarlar.update({
        ...(hfToken ? { hf_token: hfToken } : {}),
        hf_llm_model: llmModel,
        hf_stt_model: sttModel,
        hf_tts_model: ttsModel,
        mod,
        max_tur: maxTur,
        twilio_account_sid: twilioSid || undefined,
        twilio_auth_token: twilioAuth || undefined,
        twilio_phone_number: twilioNumara || undefined,
      }),
    onSuccess: () => {
      setHfToken("");
      setTwilioAuth("");
      queryClient.invalidateQueries({ queryKey: ["ayarlar"] });
    },
  });

  if (ayarlar.isLoading) return <Spinner label="Ayarlar yükleniyor..." />;
  if (ayarlar.isError) return <ErrorState message={(ayarlar.error as Error).message} />;

  return (
    <div className="max-w-2xl">
      <PageHeader title="Ayarlar" description="Hugging Face model ayarları ve arama modu" />

      <form
        className="flex flex-col gap-6"
        onSubmit={(e) => {
          e.preventDefault();
          kaydet.mutate();
        }}
      >
        <Card className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <p className="font-medium text-white">Hugging Face</p>
            <Badge tone={ayarlar.data?.hf_token_ayarli ? "green" : "amber"}>
              {ayarlar.data?.hf_token_ayarli ? "Token Ayarlı" : "Token Girilmedi"}
            </Badge>
          </div>
          <div>
            <Label>HF Access Token</Label>
            <Input
              type="password"
              value={hfToken}
              onChange={(e) => setHfToken(e.target.value)}
              placeholder={ayarlar.data?.hf_token_ayarli ? "•••••••• (değiştirmek için yazın)" : "hf_..."}
            />
          </div>
          <div>
            <Label>LLM Modeli</Label>
            <Input value={llmModel} onChange={(e) => setLlmModel(e.target.value)} placeholder="Qwen/Qwen2.5-7B-Instruct" />
          </div>
          <div>
            <Label>STT (Konuşmadan Metne) Modeli</Label>
            <Input value={sttModel} onChange={(e) => setSttModel(e.target.value)} placeholder="openai/whisper-large-v3" />
          </div>
          <div>
            <Label>TTS (Metinden Sese) Modeli</Label>
            <Input value={ttsModel} onChange={(e) => setTtsModel(e.target.value)} placeholder="ResembleAI/chatterbox" />
          </div>
        </Card>

        <Card className="flex flex-col gap-4">
          <p className="font-medium text-white">Arama Modu</p>
          <div>
            <Label>Mod</Label>
            <Select value={mod} onChange={(e) => setMod(e.target.value as AramaMod)}>
              <option value="simulasyon">Tarayıcı Simülasyonu (varsayılan, ücretsiz)</option>
              <option value="twilio">Twilio (gerçek telefon araması)</option>
            </Select>
          </div>
          <div>
            <Label>Çağrı Başına Maksimum Tur (maliyet koruması)</Label>
            <Input type="number" min={1} max={50} value={maxTur} onChange={(e) => setMaxTur(Number(e.target.value))} />
          </div>
        </Card>

        <Card className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <p className="font-medium text-white">Twilio (opsiyonel)</p>
            <Badge tone={ayarlar.data?.twilio_ayarli ? "green" : "slate"}>
              {ayarlar.data?.twilio_ayarli ? "Ayarlı" : "Ayarlı Değil"}
            </Badge>
          </div>
          <p className="text-xs text-slate-400">
            Gerçek telefon araması için Twilio hesap bilgilerinizi girin. Doldurulmadan "Twilio" modu kullanılamaz.
          </p>
          <div>
            <Label>Account SID</Label>
            <Input value={twilioSid} onChange={(e) => setTwilioSid(e.target.value)} placeholder="AC..." />
          </div>
          <div>
            <Label>Auth Token</Label>
            <Input
              type="password"
              value={twilioAuth}
              onChange={(e) => setTwilioAuth(e.target.value)}
              placeholder={ayarlar.data?.twilio_ayarli ? "•••••••• (değiştirmek için yazın)" : ""}
            />
          </div>
          <div>
            <Label>Telefon Numarası</Label>
            <Input value={twilioNumara} onChange={(e) => setTwilioNumara(e.target.value)} placeholder="+90..." />
          </div>
        </Card>

        {kaydet.isError && <ErrorState message={(kaydet.error as Error).message} />}
        {kaydet.isSuccess && <p className="text-sm text-emerald-400">Ayarlar kaydedildi.</p>}

        <Button type="submit" disabled={kaydet.isPending} className="self-start">
          {kaydet.isPending ? "Kaydediliyor..." : "Ayarları Kaydet"}
        </Button>
      </form>
    </div>
  );
}
