import type { Arama, Senaryo } from "../types.js";
import type { AiTurSonucu, TurSonucu } from "../services/orchestrator.js";

// Both the simulation (browser mic) and future Twilio (real PSTN) providers implement
// this same shape, delegating to the shared orchestrator. Only the I/O around it differs:
// simulatedProvider speaks JSON+base64 over a WebSocket to the browser, twilioProvider
// would speak Twilio's Media Streams protocol. The rule engine / LLM / TTS code never changes.
export interface CallProvider {
  karsilamayiGonder(arama: Arama, senaryo: Senaryo): Promise<AiTurSonucu>;
  turIsle(aramaId: string, audio: Buffer, mime: string): Promise<TurSonucu>;
  sonlandir(aramaId: string): Promise<void>;
}
