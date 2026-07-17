# CEX — AI Çağrı Platformu

Önceden tanımlanmış senaryolara ve kural setlerine göre otomatik olarak arama yapan veya gelen aramaları cevaplayan bir AI çağrı platformu MVP'si. Arayüz tamamen Türkçe'dir.

## Mimari

- **Frontend** (repo kökünde): React + Vite + TypeScript + Tailwind. Sayfalar: Panel, Senaryolar, Arama Günlükleri, Arama Başlat, Ayarlar.
- **`server/`**: Node.js + Express + WebSocket backend. STT ve LLM çağrıları Hugging Face üzerinden, TTS (metinden sese) çağrıları ise ElevenLabs üzerinden yapılır — canlı HF Inference Providers kataloğunda güvenilir Türkçe konuşan bir TTS modeli bulunmadığı için bu parça HF dışında tutuldu (bkz. aşağıdaki not). API anahtarları/token'lar yalnızca burada tutulur, tarayıcıya asla gönderilmez.
- **Veritabanı**: Postgres. Tüm senaryolar/aramalar/ayarlar `DATABASE_URL` ile bağlanılan bir Postgres'te tutulur — yerel bir dosyada değil, bu sayede deploy/restart'larda veri kaybolmaz.
- **Arama modu**: MVP varsayılan olarak **tarayıcı simülasyonu** ile çalışır — mikrofonla konuşup AI'ın sesli yanıtını dinlediğiniz, gerçek telefon hattı gerektirmeyen bir döngü (basılı-tut-konuş / turn-based). Gerçek telefon araması (Twilio) için altyapı hazır şekilde eklenmiştir ancak Ayarlar sayfasından kendi Twilio hesap bilgilerinizi girmeden aktif olmaz.

## Kurulum

```bash
npm run install:all   # hem frontend hem server bağımlılıklarını kurar
cp server/.env.example server/.env
```

`server/.env` içine üç şeyi doldurun:

1. **HF_TOKEN** — https://huggingface.co/settings/tokens (STT + LLM için)
2. **ELEVENLABS_API_KEY** — https://elevenlabs.io/app/settings/api-keys (TTS için)
3. **DATABASE_URL** — bir Postgres bağlantı adresi. İki seçenek:
   - **Yerel geliştirme**: `docker run -d --name cex-postgres -e POSTGRES_PASSWORD=cex -e POSTGRES_DB=cex -p 5433:5432 postgres:16-alpine` çalıştırıp `postgres://postgres:cex@localhost:5433/cex` kullanın.
   - **Ücretsiz barındırılan**: [Neon](https://neon.tech) veya [Supabase](https://supabase.com) üzerinde bir proje açıp verilen bağlantı adresini yapıştırın — bu adresi deploy ederken de kullanacaksınız.

HF token ve ElevenLabs anahtarı uygulama içinden Ayarlar sayfasına da girilebilir; `DATABASE_URL` ise yalnızca `.env`'den okunur (sunucu ayağa kalkarken bağlanması gerektiği için).

## Geliştirme

```bash
npm run dev
```

Bu komut frontend'i (http://localhost:5173) ve backend'i (http://localhost:4000) birlikte başlatır; Vite, `/api` ve `/ws` isteklerini otomatik olarak backend'e yönlendirir.

## Kullanım akışı

1. **Ayarlar** sayfasından Hugging Face token'ınızı ve ElevenLabs API anahtarınızı girin (girilmemişse aramalar STT/LLM/TTS hatası verir).
2. **Senaryolar** sayfasından bir senaryo oluşturun: sistem promptu, karşılama mesajı ve isteğe bağlı kurallar (anahtar kelime eşleşince LLM çağrılmadan sonlandırma / özel yanıt / değişken kaydetme).
3. **Arama Başlat** sayfasından senaryoyu seçip test araması başlatın; mikrofon butonunu basılı tutup konuşun, bırakınca AI yanıtlar.
4. **Arama Günlükleri**'nde geçmiş çağrıların transkriptini, toplanan değişkenleri ve tahmini API kullanımını görebilirsiniz.

## Maliyet/token optimizasyonu

Her API çağrısı bir maliyet/kota tükettiği için orchestrator şu önlemleri uygular: kural eşleşen dönüşlerde LLM'i tamamen atlama, LLM'e yalnızca son ~6 turluk kaydırmalı geçmiş gönderme, sabit `max_tokens` sınırı, tekrarlanan metinler için TTS ses önbelleği, sessiz kayıtları hiç göndermeme ve çağrı başına maksimum tur sınırı (Ayarlar'dan yapılandırılabilir).

## Neden TTS için Hugging Face değil ElevenLabs?

Araştırma sonucu: Hugging Face Inference Providers üzerinde canlı (live) durumda olan TTS modelleri arasında güvenilir Türkçe desteği sunan tek bir model bile yok. `ResembleAI/chatterbox` gibi çokdilli olduğu iddia edilen modellerin bile HF üzerinden erişilebilen tek canlı ucu İngilizce'ye sabit (chatterbox'ın gerçek çokdilli modu farklı, HF'de kayıtlı olmayan bir fal.ai rotasında). Bu yüzden STT (Whisper) ve LLM (Qwen) Hugging Face'te kalırken, TTS için doğrulanmış Türkçe desteği olan ElevenLabs (`eleven_multilingual_v2`) kullanılıyor.

## Deploy

Uygulama tek bir servis olarak deploy edilir: `server/` derlenmiş halde hem API/WebSocket'i hem de derlenmiş React uygulamasını (repo kökündeki `dist/`) aynı porttan sunar — ayrı bir statik host veya CORS ayarına gerek yoktur.

```bash
npm run build:all   # frontend + server derlenir
npm start           # server/dist/index.js, hem API'yi hem derlenmiş frontend'i tek porttan sunar
```

Railway, Render, Fly.io gibi bir platforma deploy ederken:

1. Build komutu: `npm run install:all && npm run build:all`
2. Start komutu: `npm start`
3. Ortam değişkenleri: `HF_TOKEN`, `ELEVENLABS_API_KEY`, `DATABASE_URL` (Neon/Supabase gibi bir Postgres'e işaret etsin), `PORT` (çoğu platform bunu otomatik sağlar)
4. WebSocket desteği açık olmalı — seçtiğiniz platformun bunu desteklediğini doğrulayın (Railway/Render/Fly.io hepsi destekler).

Veritabanı artık Postgres olduğu için veri, platformun dosya sistemi ephemeral olsa bile redeploy/restart'larda kaybolmaz — tek şart `DATABASE_URL`'nin kalıcı bir Postgres'e işaret etmesi.

## Twilio (gerçek arama) — opsiyonel, ileri seviye

`server/src/providers/twilioProvider.ts` ve `server/src/routes/twilioWebhooks.ts` dosyalarında ne yapılması gerektiği belgelenmiştir: kendi Twilio hesabınız, satın alınmış bir telefon numaranız ve genel erişilebilir bir webhook URL'niz (örn. `ngrok http 4000`) olması gerekir. Bu kimlik bilgileri girilip Ayarlar'da mod "twilio" yapılmadan bu yol devre dışı kalır.

## Notlar / bilinen sınırlamalar (MVP kapsamı)

- Ses akışı gerçek zamanlı değil, tur bazlıdır (bas-konuş-bırak). Tam çift yönlü canlı akış (barge-in vb.) MVP kapsamı dışıdır.
- Ses kayıtları diske kaydedilmez, yalnızca metin transkripti tutulur.
- Twilio entegrasyonu iskelet halindedir; gerçek bir hesap olmadan test edilemez.
