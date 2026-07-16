import type { IncomingMessage } from "node:http";
import type { Duplex } from "node:stream";
import { WebSocketServer, type WebSocket } from "ws";
import { aramaRepo, senaryoRepo } from "../db/repo.js";
import { aramayiElleSonlandir, karsilamayiGonder, turIsle } from "../services/orchestrator.js";
import type { CallProvider } from "./callProvider.js";

// MVP default provider: no telephony account needed. The browser records a push-to-talk
// clip, sends it here as base64 over a WebSocket, and gets the AI's spoken reply back the
// same way. See src/lib/ws.ts on the frontend for the exact message protocol.
const wss = new WebSocketServer({ noServer: true });

export function simulatedProviderUpgradeIsle(req: IncomingMessage, socket: Duplex, head: Buffer) {
  const url = new URL(req.url ?? "", "http://localhost");
  const match = url.pathname.match(/^\/ws\/calls\/([^/]+)$/);
  if (!match) {
    socket.destroy();
    return;
  }
  const callId = match[1];
  wss.handleUpgrade(req, socket, head, (ws) => {
    baglantiyiIsle(ws, callId);
  });
}

function gonder(ws: WebSocket, payload: unknown) {
  ws.send(JSON.stringify(payload));
}

function baglantiyiIsle(ws: WebSocket, callId: string) {
  ws.on("message", async (raw) => {
    try {
      const msg = JSON.parse(raw.toString());

      if (msg.type === "baslat") {
        const arama = aramaRepo.get(callId);
        const senaryo = arama && senaryoRepo.get(arama.scenario_id);
        if (!arama || !senaryo) {
          gonder(ws, { type: "hata", mesaj: "Arama veya senaryo bulunamadı." });
          return;
        }
        await aramaRepo.update(callId, { durum: "devam_ediyor" });
        const ai = await karsilamayiGonder(arama, senaryo);
        gonder(ws, {
          type: "ai_turu",
          metin: ai.metin,
          audio_base64: ai.ses.buffer.toString("base64"),
          mime: ai.ses.mime,
        });
        return;
      }

      if (msg.type === "ses_turu") {
        gonder(ws, { type: "kullanici_turu_isleniyor" });
        const audio = Buffer.from(msg.audio_base64, "base64");
        const sonucTur = await turIsle(callId, audio, msg.mime ?? "audio/webm");
        gonder(ws, { type: "kullanici_turu", metin: sonucTur.kullaniciMetni });
        gonder(ws, {
          type: "ai_turu",
          metin: sonucTur.ai.metin,
          audio_base64: sonucTur.ai.ses.buffer.toString("base64"),
          mime: sonucTur.ai.ses.mime,
        });
        if (sonucTur.bitti && sonucTur.sonuc) {
          gonder(ws, { type: "arama_bitti", sonuc: sonucTur.sonuc });
        }
        return;
      }

      if (msg.type === "sonlandir") {
        const sonuc = await aramayiElleSonlandir(callId);
        gonder(ws, { type: "arama_bitti", sonuc });
      }
    } catch (err) {
      gonder(ws, { type: "hata", mesaj: err instanceof Error ? err.message : "Bilinmeyen hata" });
    }
  });
}

export const simulatedProvider: CallProvider = {
  karsilamayiGonder: (arama, senaryo) => karsilamayiGonder(arama, senaryo),
  turIsle: (aramaId, audio, mime) => turIsle(aramaId, audio, mime),
  sonlandir: async (aramaId) => {
    await aramayiElleSonlandir(aramaId);
  },
};
