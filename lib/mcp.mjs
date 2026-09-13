import {createThreadFingerprintReport} from "./fingerprint.mjs";
import {normalizeLegacyReference} from "./legacy-reference.mjs";

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
  description: "Returns a deterministic SHA-256 fingerprint derived from ChatGPT's documented anonymized conversation metadata. An optional NMCP reference can record that the current conversation references a legacy conversation. It does not return raw identifiers, conversation content, titles, URLs, user identity, organization identity, request headers, or runtime metadata, and it does not persist observations.",
  inputSchema: {
    type: "object",
    properties: {
      legacyReference: {
        type: "string",
        pattern: "^TFP1-NMCP(?:-[A-Fa-f0-9]{4}){4}$",
        description: "Optional provisional reference for an older conversation that could not invoke the MCP tool.",
      },
    },
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
      continuity: {
        type: "object",
        properties: {
          legacyReference: {type: "string"},
          relationship: {type: "string", enum: ["current-conversation-references-legacy"]},
          legacyReferenceValidated: {type: "boolean", enum: [false]},
          currentFingerprintValidated: {type: "boolean"},
        },
        required: [
          "legacyReference",
          "relationship",
          "legacyReferenceValidated",
          "currentFingerprintValidated",
        ],
        additionalProperties: false,
      },
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

function validateArguments(args) {
  if (args === undefined) return {};
  if (args === null || typeof args !== "object" || Array.isArray(args)) {
    throw new TypeError("Tool arguments must be an object.");
  }
  const unexpected = Object.keys(args).filter((key) => key !== "legacyReference");
  if (unexpected.length > 0) {
    throw new TypeError(`Unexpected tool argument: ${unexpected[0]}`);
  }
  return args.legacyReference === undefined
    ? {}
    : {legacyReference: normalizeLegacyReference(args.legacyReference)};
}

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
      let args;
      try {
        args = validateArguments(message.params?.arguments);
      } catch (error) {
        return jsonRpcError(id, -32602, error.message);
      }
      const report = await createThreadFingerprintReport(message.params?._meta, options);
      if (args.legacyReference) {
        report.continuity = {
          legacyReference: args.legacyReference,
          relationship: "current-conversation-references-legacy",
          legacyReferenceValidated: false,
          currentFingerprintValidated: report.status === "available",
        };
      }
      const text = report.status === "available"
        ? `Thread fingerprint: ${report.fingerprint.display}\nFull SHA-256: ${report.fingerprint.value}\nThis read-only utility did not return or persist the raw conversation identifier.`
        : `Thread fingerprint unavailable: ${report.reason}`;
      const continuityText = report.continuity
        ? `\nLegacy reference: ${report.continuity.legacyReference}\nRelationship: the current conversation references the legacy conversation; this relationship is user asserted, and the legacy reference was not validated from host metadata.`
        : "";
      return jsonRpc(id, {
        content: [{type: "text", text: text + continuityText}],
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
