# CEX — AI Çağrı Platformu

Önceden tanımlanmış senaryolara ve kural setlerine göre otomatik olarak arama yapan veya gelen aramaları cevaplayan bir AI çağrı platformu MVP'si. Arayüz tamamen Türkçe'dir.

## Mimari

- **Frontend** (repo kökünde): React + Vite + TypeScript + Tailwind. Sayfalar: Panel, Senaryolar, Arama Günlükleri, Arama Başlat, Ayarlar.
- **`server/`**: Node.js + Express + WebSocket backend. Hugging Face API çağrılarını (STT/LLM/TTS) ve arama kayıtlarını yönetir. HF token gibi gizli bilgiler yalnızca burada tutulur, tarayıcıya asla gönderilmez.
- **Arama modu**: MVP varsayılan olarak **tarayıcı simülasyonu** ile çalışır — mikrofonla konuşup AI'ın sesli yanıtını dinlediğiniz, gerçek telefon hattı gerektirmeyen bir döngü (basılı-tut-konuş / turn-based). Gerçek telefon araması (Twilio) için altyapı hazır şekilde eklenmiştir ancak Ayarlar sayfasından kendi Twilio hesap bilgilerinizi girmeden aktif olmaz.

## Kurulum

```bash
npm run install:all   # hem frontend hem server bağımlılıklarını kurar
cp server/.env.example server/.env
# server/.env içine Hugging Face access token'ınızı girin (https://huggingface.co/settings/tokens)
# Alternatif olarak token'ı uygulama içinden Ayarlar sayfasına da girebilirsiniz.
```

## Geliştirme

```bash
npm run dev
```

Bu komut frontend'i (http://localhost:5173) ve backend'i (http://localhost:4000) birlikte başlatır; Vite, `/api` ve `/ws` isteklerini otomatik olarak backend'e yönlendirir.

## Kullanım akışı

1. **Ayarlar** sayfasından Hugging Face token'ınızı girin (girilmemişse aramalar STT/LLM/TTS hatası verir).
2. **Senaryolar** sayfasından bir senaryo oluşturun: sistem promptu, karşılama mesajı ve isteğe bağlı kurallar (anahtar kelime eşleşince LLM çağrılmadan sonlandırma / özel yanıt / değişken kaydetme).
3. **Arama Başlat** sayfasından senaryoyu seçip test araması başlatın; mikrofon butonunu basılı tutup konuşun, bırakınca AI yanıtlar.
4. **Arama Günlükleri**'nde geçmiş çağrıların transkriptini, toplanan değişkenleri ve tahmini API kullanımını görebilirsiniz.

## Maliyet/token optimizasyonu

Her Hugging Face çağrısı bir maliyet/kota tükettiği için orchestrator şu önlemleri uygular: kural eşleşen dönüşlerde LLM'i tamamen atlama, LLM'e yalnızca son ~6 turluk kaydırmalı geçmiş gönderme, sabit `max_tokens` sınırı, tekrarlanan metinler için TTS ses önbelleği, sessiz kayıtları hiç göndermeme ve çağrı başına maksimum tur sınırı (Ayarlar'dan yapılandırılabilir).

## Twilio (gerçek arama) — opsiyonel, ileri seviye

`server/src/providers/twilioProvider.ts` ve `server/src/routes/twilioWebhooks.ts` dosyalarında ne yapılması gerektiği belgelenmiştir: kendi Twilio hesabınız, satın alınmış bir telefon numaranız ve genel erişilebilir bir webhook URL'niz (örn. `ngrok http 4000`) olması gerekir. Bu kimlik bilgileri girilip Ayarlar'da mod "twilio" yapılmadan bu yol devre dışı kalır.

## Notlar / bilinen sınırlamalar (MVP kapsamı)

- Ses akışı gerçek zamanlı değil, tur bazlıdır (bas-konuş-bırak). Tam çift yönlü canlı akış (barge-in vb.) MVP kapsamı dışıdır.
- Veri kalıcılığı basit bir JSON dosyasıdır (`server/data/db.json`); üretime geçerken Postgres/SQLite gibi bir veritabanına taşınması önerilir.
- Ses kayıtları diske kaydedilmez, yalnızca metin transkripti tutulur.
- Twilio entegrasyonu iskelet halindedir; gerçek bir hesap olmadan test edilemez.
