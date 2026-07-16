import twilioLib from "twilio";
import { settingsRepo } from "../db/repo.js";

// Scaffold only — not wired into the MVP by default (mode = "simulasyon").
// To activate real phone calls:
//  1. User fills Twilio Account SID / Auth Token / phone number in Ayarlar.
//  2. Set mode to "twilio" in Ayarlar.
//  3. Deploy this server somewhere with a public URL (or `ngrok http 4000` in dev) and point
//     the Twilio phone number's voice webhook at POST {public_url}/webhooks/twilio/voice.
//  4. Implement Twilio Media Streams handling here (bidirectional audio over their WS
//     protocol, μ-law 8kHz frames) reusing the same orchestrator.turIsle / karsilamayiGonder
//     functions the simulation provider already calls — the rule engine and AI pipeline
//     do not change, only the audio transport does.
// None of this can be exercised without the user's own Twilio account and credentials.

export function twilioYapilandirilmisMi(): boolean {
  const s = settingsRepo.get();
  return Boolean(s.twilio_account_sid && s.twilio_auth_token && s.twilio_phone_number);
}

export async function outboundCallBaslat(hedefNumara: string, webhookUrl: string) {
  const settings = settingsRepo.get();
  if (!twilioYapilandirilmisMi()) {
    throw new Error("Twilio kimlik bilgileri Ayarlar sayfasından girilmedi.");
  }
  const client = twilioLib(settings.twilio_account_sid!, settings.twilio_auth_token!);
  return client.calls.create({
    to: hedefNumara,
    from: settings.twilio_phone_number!,
    // Should point at a route returning TwiML with <Connect><Stream> to our WS media endpoint.
    url: webhookUrl,
  });
}
