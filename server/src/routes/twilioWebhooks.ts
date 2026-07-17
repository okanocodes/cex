import { Router } from "express";
import { twilioYapilandirilmisMi } from "../providers/twilioProvider.js";

// Scaffold — see providers/twilioProvider.ts for what activating this requires.
export const twilioWebhooksRouter = Router();

twilioWebhooksRouter.post("/voice", async (_req, res) => {
  if (!(await twilioYapilandirilmisMi())) {
    res
      .status(200)
      .type("text/xml")
      .send(
        `<?xml version="1.0" encoding="UTF-8"?><Response><Say language="tr-TR">Bu hat henüz yapılandırılmadı.</Say></Response>`,
      );
    return;
  }
  // TODO: look up the scenario mapped to the called number, then respond with TwiML
  // <Connect><Stream> pointing at a WS media endpoint wired to orchestrator.turIsle.
  res
    .status(501)
    .type("text/xml")
    .send(
      `<?xml version="1.0" encoding="UTF-8"?><Response><Say language="tr-TR">Twilio entegrasyonu henüz tamamlanmadı.</Say></Response>`,
    );
});

twilioWebhooksRouter.post("/status", (_req, res) => {
  res.status(200).end();
});
