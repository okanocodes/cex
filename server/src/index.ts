import "dotenv/config";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
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

// In production this server also serves the built React app (repo-root `dist/`), so the
// whole thing deploys as a single service — no separate static host/CORS setup needed.
// In dev, the Vite dev server handles the frontend instead and this block is a no-op.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const frontendDist = path.join(__dirname, "..", "..", "dist");
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get(/^(?!\/api|\/webhooks|\/health).*/, (_req, res) => {
    res.sendFile(path.join(frontendDist, "index.html"));
  });
}

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
