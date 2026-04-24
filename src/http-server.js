import http from "node:http";
import { info } from "./logger.js";

function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];

    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

export function createServer({ port, whatsappWebhook }) {
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);

    if (req.method === "GET" && url.pathname === "/healthz") {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ ok: true }));
      return;
    }

    if (whatsappWebhook && url.pathname === "/webhook/whatsapp" && req.method === "GET") {
      whatsappWebhook.handleVerification(req, res, url);
      return;
    }

    if (whatsappWebhook && url.pathname === "/webhook/whatsapp" && req.method === "POST") {
      const body = await readRequestBody(req);
      await whatsappWebhook.handleIncoming(req, res, body);
      return;
    }

    res.writeHead(404, { "content-type": "text/plain" });
    res.end("Not found");
  });

  return new Promise((resolve) => {
    server.listen(port, () => {
      info(`HTTP server listening on port ${port}`);
      resolve(server);
    });
  });
}

