import {createThreadFingerprintReport} from "./fingerprint.mjs";

export const SERVER_NAME = "thread-fingerprint";
export const TOOL_NAME = "identify_thread";
export const VERSION = "0.2.0-pre.1";

function jsonRpc(id, result) {
  return {jsonrpc: "2.0", id: id ?? null, result};
}

function jsonRpcError(id, code, message) {
  return {jsonrpc: "2.0", id: id ?? null, error: {code, message}};
}

const tool = {
  name: TOOL_NAME,
  title: "Identify this conversation",
  description: "Returns a deterministic SHA-256 fingerprint derived from ChatGPT's documented anonymized conversation metadata. It does not return raw identifiers, conversation content, titles, URLs, user identity, organization identity, request headers, or runtime metadata, and it does not persist observations.",
  inputSchema: {
    type: "object",
    properties: {},
    additionalProperties: false,
  },
  outputSchema: {
    type: "object",
    properties: {
      schemaVersion: {type: "integer"},
      status: {type: "string", enum: ["available", "unavailable"]},
      observedAt: {type: "string"},
      fingerprint: {
        anyOf: [
          {type: "null"},
          {
            type: "object",
            properties: {
              version: {type: "string"},
              algorithm: {type: "string"},
              sourceField: {type: "string"},
              value: {type: "string"},
              display: {type: "string"},
            },
            required: ["version", "algorithm", "sourceField", "value", "display"],
            additionalProperties: false,
          },
        ],
      },
      privacy: {type: "object"},
      limitations: {type: "array", items: {type: "string"}},
      reason: {type: "string"},
    },
    required: ["schemaVersion", "status", "observedAt", "fingerprint", "privacy", "limitations"],
    additionalProperties: false,
  },
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
};

export async function handleRpc(message, options) {
  const id = message?.id;
  switch (message?.method) {
    case "initialize":
      return jsonRpc(id, {
        protocolVersion: message.params?.protocolVersion || "2025-06-18",
        capabilities: {tools: {listChanged: false}},
        serverInfo: {name: SERVER_NAME, version: VERSION},
      });
    case "ping":
      return jsonRpc(id, {});
    case "tools/list":
      return jsonRpc(id, {tools: [tool]});
    case "tools/call": {
      if (message.params?.name !== TOOL_NAME) {
        return jsonRpcError(id, -32602, "Unknown tool");
      }
      const report = await createThreadFingerprintReport(message.params?._meta, options);
      const text = report.status === "available"
        ? `Thread fingerprint: ${report.fingerprint.display}\nFull SHA-256: ${report.fingerprint.value}\nThis read-only utility did not return or persist the raw conversation identifier.`
        : `Thread fingerprint unavailable: ${report.reason}`;
      return jsonRpc(id, {
        content: [{type: "text", text}],
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
