// WebSocket protocol for the simulated call loop (turn-based / push-to-talk).
// Client -> Server: { type: "baslat" } | { type: "ses_turu", audio_base64, mime } | { type: "sonlandir" }
// Server -> Client: { type: "ai_turu", metin, audio_base64?, mime? }
//                  | { type: "kullanici_turu_isleniyor" }
//                  | { type: "arama_bitti", sonuc }
//                  | { type: "hata", mesaj }

import { getToken } from "./auth";

export type SunucuMesaj =
  | { type: "ai_turu"; metin: string; audio_base64?: string; mime?: string }
  | { type: "kullanici_turu"; metin: string }
  | { type: "kullanici_turu_isleniyor" }
  | { type: "arama_bitti"; sonuc: { degiskenler: Record<string, string>; etiket?: string } }
  | { type: "hata"; mesaj: string };

export class CallSocket {
  private ws: WebSocket;

  constructor(callId: string, onMessage: (msg: SunucuMesaj) => void, onClose?: () => void) {
    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    // Browsers can't set custom headers on a WebSocket handshake, so the JWT travels as a
    // query param instead — validated server-side in simulatedProvider.ts before upgrading.
    const token = getToken();
    this.ws = new WebSocket(
      `${protocol}://${window.location.host}/ws/calls/${callId}?token=${encodeURIComponent(token ?? "")}`,
    );
    this.ws.onmessage = (event) => {
      try {
        onMessage(JSON.parse(event.data) as SunucuMesaj);
      } catch {
        onMessage({ type: "hata", mesaj: "Sunucudan gelen mesaj çözümlenemedi." });
      }
    };
    this.ws.onclose = () => onClose?.();
  }

  private send(payload: unknown) {
    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(payload));
    }
  }

  baslat() {
    if (this.ws.readyState === WebSocket.OPEN) {
      this.send({ type: "baslat" });
    } else {
      this.ws.addEventListener("open", () => this.send({ type: "baslat" }), { once: true });
    }
  }

  sesGonder(audioBase64: string, mime: string) {
    this.send({ type: "ses_turu", audio_base64: audioBase64, mime });
  }

  sonlandir() {
    this.send({ type: "sonlandir" });
  }

  kapat() {
    this.ws.close();
  }
}

export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1] ?? "");
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
