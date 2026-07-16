import "dotenv/config";
import http from "node:http";
import express from "express";
import cors from "cors";
import { scenariosRouter } from "./routes/scenarios.js";
import { callsRouter } from "./routes/calls.js";
import { settingsRouter } from "./routes/settings.js";
import { twilioWebhooksRouter } from "./routes/twilioWebhooks.js";
import { simulatedProviderUpgradeIsle } from "./providers/simulatedProvider.js";

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));

app.use("/api/scenarios", scenariosRouter);
app.use("/api/calls", callsRouter);
app.use("/api/settings", settingsRouter);
app.use("/webhooks/twilio", twilioWebhooksRouter);

app.get("/health", (_req, res) => res.json({ ok: true }));

const server = http.createServer(app);

// Only simulation-mode WebSocket calls are routed here in the MVP; Twilio Media Streams
// would need its own upgrade path once that provider is wired up.
server.on("upgrade", (req, socket, head) => {
  simulatedProviderUpgradeIsle(req, socket, head);
});

const PORT = Number(process.env.PORT ?? 4000);
server.listen(PORT, () => {
  console.log(`CEX sunucusu http://localhost:${PORT} adresinde çalışıyor`);
});
