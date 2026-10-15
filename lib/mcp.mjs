import {createThreadFingerprintReport} from "./fingerprint.mjs";
import {createConversationUrlProbeReport} from "./url-probe.mjs";

export const SERVER_NAME = "thread-fingerprint";
export const TOOL_NAME = "identify_thread";
export const PROBE_TOOL_NAME = "probe_conversation_url";
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

const probeTool = {
  name: PROBE_TOOL_NAME,
  title: "Probe a conversation URL",
  description: "Staging-only diagnostic that compares a user-supplied ChatGPT conversation URL with the current call's anonymized conversation metadata in memory. It returns only match classifications and booleans; it does not return or persist the URL, extracted identifier, or raw metadata.",
  inputSchema: {
    type: "object",
    properties: {
      conversationUrl: {type: "string"},
    },
    required: ["conversationUrl"],
    additionalProperties: false,
  },
  outputSchema: {
    type: "object",
    properties: {
      schemaVersion: {type: "integer"},
      status: {
        type: "string",
        enum: [
          "verified_match",
          "not_a_match",
          "identifier_unavailable",
          "unsupported_url_format",
          "inconclusive",
        ],
      },
      observedAt: {type: "string"},
      sessionAvailable: {type: "boolean"},
      urlRecognized: {type: "boolean"},
      routeType: {
        anyOf: [
          {type: "null"},
          {type: "string", enum: ["conversation", "project-conversation"]},
        ],
      },
      checks: {
        anyOf: [
          {type: "null"},
          {
            type: "object",
            properties: {
              exactMatch: {type: "boolean"},
              versionPrefixedMatch: {type: "boolean"},
              containsConversationId: {type: "boolean"},
              terminalIdentifierMatch: {type: "boolean"},
            },
            required: [
              "exactMatch",
              "versionPrefixedMatch",
              "containsConversationId",
              "terminalIdentifierMatch",
            ],
            additionalProperties: false,
          },
        ],
      },
      transformationChecks: {
        anyOf: [
          {type: "null"},
          {
            type: "object",
            properties: Object.fromEntries([
              "conversationId",
              "versionPrefixedConversationId",
              "conversationPath",
              "canonicalConversationUrl",
              "suppliedConversationUrl",
            ].map((name) => [name, {
              type: "object",
              properties: {
                hex: {type: "boolean"},
                base64: {type: "boolean"},
                base64url: {type: "boolean"},
              },
              required: ["hex", "base64", "base64url"],
              additionalProperties: false,
            }])),
            required: [
              "conversationId",
              "versionPrefixedConversationId",
              "conversationPath",
              "canonicalConversationUrl",
              "suppliedConversationUrl",
            ],
            additionalProperties: false,
          },
        ],
      },
      classification: {
        type: "string",
        enum: [
          "exact_conversation_id",
          "v1_prefixed_conversation_id",
          "terminal_conversation_id",
          "contains_conversation_id",
          "sha256_derived_conversation_id",
          "unrelated_anonymized_id",
          "unavailable",
        ],
      },
      privacy: {type: "object"},
      limitations: {type: "array", items: {type: "string"}},
    },
    required: [
      "schemaVersion",
      "status",
      "observedAt",
      "sessionAvailable",
      "urlRecognized",
      "routeType",
      "checks",
      "transformationChecks",
      "classification",
      "privacy",
      "limitations",
    ],
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
      return jsonRpc(id, {
        tools: options?.enableUrlProbe ? [tool, probeTool] : [tool],
      });
    case "tools/call": {
      if (message.params?.name === TOOL_NAME) {
        const report = await createThreadFingerprintReport(message.params?._meta, options);
        const text = report.status === "available"
          ? `Thread fingerprint: ${report.fingerprint.display}\nFull SHA-256: ${report.fingerprint.value}\nThis read-only utility did not return or persist the raw conversation identifier.`
          : `Thread fingerprint unavailable: ${report.reason}`;
        return jsonRpc(id, {
          content: [{type: "text", text}],
          structuredContent: report,
        });
      }
      if (message.params?.name === PROBE_TOOL_NAME && options?.enableUrlProbe) {
        const report = await createConversationUrlProbeReport(
          message.params?._meta,
          message.params?.arguments,
          options,
        );
        return jsonRpc(id, {
          content: [{
            type: "text",
            text: `Conversation URL probe result: ${report.status}. Classification: ${report.classification}. No raw session, URL, or extracted identifier was returned or persisted.`,
          }],
          structuredContent: report,
        });
      }
      return jsonRpcError(id, -32602, "Unknown tool");
    }
    case "notifications/initialized":
    case "notifications/cancelled":
      return null;
    default:
      return jsonRpcError(id, -32601, "Method not found");
  }
}
