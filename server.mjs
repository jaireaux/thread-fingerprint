import http from "node:http";
import process from "node:process";

export const MARKER = "DSHS-THREAD-METADATA-DIAGNOSTIC";
export const TOOL_NAME = "inspect_context";
export const VERSION = "0.1.0-pre.2";

const PORT = Number.parseInt(process.env.PORT || "8787", 10);
const HOST = process.env.HOST || "127.0.0.1";
const MAX_BODY_BYTES = 64 * 1024;
const SECRET_KEY = /^(authorization|proxy-authorization|cookie|set-cookie|x-api-key|api[-_]?key|access[-_]?token|refresh[-_]?token|password|passwd|client[-_]?secret|private[-_]?key)$/i;
const PRIVATE_NETWORK_HEADER = /^(cf-connecting-ip|x-forwarded-for|x-real-ip|forwarded)$/i;

function sanitize(value, seen = new WeakSet()) {
  if (value === null || typeof value !== "object") return value;
  if (seen.has(value)) return "[CIRCULAR]";
  seen.add(value);
  if (Array.isArray(value)) return value.map((item) => sanitize(item, seen));
  const clean = {};
  for (const [key, item] of Object.entries(value)) {
    clean[key] = SECRET_KEY.test(key) ? "[REDACTED]" : sanitize(item, seen);
  }
  return clean;
}

function requestHeaders(req) {
  return sanitize(Object.fromEntries(
    Object.entries(req.headers).map(([key, value]) => [
      key,
      PRIVATE_NETWORK_HEADER.test(key) ? "[REDACTED]" : (value ?? null),
    ]),
  ));
}

export function inspectContext(params, req) {
  return {
    diagnostic: {
      marker: MARKER,
      version: VERSION,
      readOnly: true,
      persisted: false,
      generatedAt: new Date().toISOString(),
    },
    toolCall: {
      arguments: sanitize(params?.arguments ?? {}),
      meta: sanitize(params?._meta ?? {}),
    },
    transport: {
      kind: "streamable-http",
      method: req.method,
      path: req.url,
      httpVersion: req.httpVersion,
      headers: requestHeaders(req),
    },
    runtime: {
      node: process.version,
      platform: process.platform,
      architecture: process.arch,
    },
    interpretation: {
      absentFieldsAreNotExposed: true,
      conversationTitleFieldAssumed: false,
      conversationIdFieldAssumed: false,
      conversationUrlFieldAssumed: false,
    },
  };
}

function jsonRpc(id, result) {
  return {jsonrpc: "2.0", id: id ?? null, result};
}

function jsonRpcError(id, code, message) {
  return {jsonrpc: "2.0", id: id ?? null, error: {code, message}};
}

export function handleRpc(message, req) {
  const id = message?.id;
  switch (message?.method) {
    case "initialize":
      return jsonRpc(id, {
        protocolVersion: message.params?.protocolVersion || "2025-06-18",
        capabilities: {tools: {listChanged: false}},
        serverInfo: {name: "thread-metadata-diagnostic", version: VERSION},
      });
    case "ping":
      return jsonRpc(id, {});
    case "tools/list":
      return jsonRpc(id, {
        tools: [{
          name: TOOL_NAME,
          title: "Inspect host/runtime metadata",
          description: `Read-only diagnostic. Pass marker ${MARKER}. Returns only sanitized arguments and metadata visible to this MCP request; it does not log or persist them.`,
          inputSchema: {
            type: "object",
            properties: {marker: {type: "string", const: MARKER}},
            required: ["marker"],
            additionalProperties: false,
          },
          annotations: {
            readOnlyHint: true,
            destructiveHint: false,
            idempotentHint: true,
            openWorldHint: false,
          },
        }],
      });
    case "tools/call": {
      if (message.params?.name !== TOOL_NAME) return jsonRpcError(id, -32602, "Unknown tool");
      if (message.params?.arguments?.marker !== MARKER) {
        return jsonRpcError(id, -32602, `marker must equal ${MARKER}`);
      }
      const report = inspectContext(message.params, req);
      return jsonRpc(id, {
        content: [{type: "text", text: JSON.stringify(report, null, 2)}],
        structuredContent: report,
      });
    }
    case "notifications/initialized":
    case "notifications/cancelled":
      return null;
    default:
      return jsonRpcError(id, -32601, "Method not found");
  }
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
      res.end(JSON.stringify({ok: true, marker: MARKER, version: VERSION}));
      return;
    }
    if (req.method !== "POST" || req.url !== "/mcp") {
      res.writeHead(404, {"content-type": "application/json"});
      res.end(JSON.stringify({error: "Not found"}));
      return;
    }
    try {
      const message = await readJson(req);
      const response = handleRpc(message, req);
      if (response === null) {
        res.writeHead(202).end();
        return;
      }
      res.writeHead(200, {"content-type": "application/json"});
      res.end(JSON.stringify(response));
    } catch (error) {
      const code = error.message === "Request body too large" ? 413 : 400;
      res.writeHead(code, {"content-type": "application/json"});
      res.end(JSON.stringify(jsonRpcError(null, -32700, error.message)));
    }
  });
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  createServer().listen(PORT, HOST, () => {
    process.stdout.write(`Thread Metadata Diagnostic listening on http://${HOST}:${PORT}/mcp\n`);
  });
}
