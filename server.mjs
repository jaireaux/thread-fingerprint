import {createHash} from "node:crypto";
import http from "node:http";
import process from "node:process";
import {handleRpc, SERVER_NAME, VERSION} from "./lib/mcp.mjs";

const PORT = Number.parseInt(process.env.PORT || "8787", 10);
const HOST = process.env.HOST || "127.0.0.1";
const MAX_BODY_BYTES = 64 * 1024;

function digestSession(session) {
  return Promise.resolve(createHash("sha256").update(session, "utf8").digest("hex"));
}

async function readJson(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) throw new Error("Request body too large");
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

export function createServer() {
  return http.createServer(async (req, res) => {
    res.setHeader("access-control-allow-origin", "*");
    res.setHeader("access-control-allow-methods", "GET, POST, OPTIONS");
    res.setHeader("access-control-allow-headers", "content-type, accept, mcp-protocol-version, mcp-session-id");

    if (req.method === "OPTIONS") {
      res.writeHead(204).end();
      return;
    }
    if (req.method === "GET" && req.url === "/health") {
      res.writeHead(200, {"content-type": "application/json"});
      res.end(JSON.stringify({
        ok: true,
        name: SERVER_NAME,
        version: VERSION,
        storage: false,
        applicationLogging: false,
      }));
      return;
    }
    if (req.method !== "POST" || req.url !== "/mcp") {
      res.writeHead(404, {"content-type": "application/json"});
      res.end(JSON.stringify({error: "Not found"}));
      return;
    }

    try {
      const message = await readJson(req);
      const response = await handleRpc(message, {digestSession});
      if (response === null) {
        res.writeHead(202).end();
        return;
      }
      res.writeHead(200, {"content-type": "application/json"});
      res.end(JSON.stringify(response));
    } catch (error) {
      const status = error.message === "Request body too large" ? 413 : 400;
      res.writeHead(status, {"content-type": "application/json"});
      res.end(JSON.stringify({
        jsonrpc: "2.0",
        id: null,
        error: {code: -32700, message: error.message},
      }));
    }
  });
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  createServer().listen(PORT, HOST, () => {
    process.stdout.write(`Thread Fingerprint listening on http://${HOST}:${PORT}/mcp\n`);
  });
}
