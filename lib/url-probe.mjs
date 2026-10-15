const ALLOWED_HOSTS = new Set(["chatgpt.com", "www.chatgpt.com"]);
const IDENTIFIER_PATTERN = /^[A-Za-z0-9_-]{8,128}$/;

function nowIso(options) {
  return (options?.now ?? (() => new Date()))().toISOString();
}

export function parseConversationUrl(value) {
  if (typeof value !== "string" || value.length === 0 || value.length > 2048) {
    return null;
  }

  let url;
  try {
    url = new URL(value);
  } catch {
    return null;
  }

  if (
    url.protocol !== "https:"
    || !ALLOWED_HOSTS.has(url.hostname)
    || url.port !== ""
    || url.username !== ""
    || url.password !== ""
    || url.search !== ""
    || url.hash !== ""
  ) {
    return null;
  }

  const segments = url.pathname.split("/").filter(Boolean);
  const conversationMarker = segments.lastIndexOf("c");
  if (conversationMarker < 0 || conversationMarker !== segments.length - 2) {
    return null;
  }

  const identifier = segments.at(-1);
  if (!IDENTIFIER_PATTERN.test(identifier)) return null;

  if (conversationMarker === 0) {
    return {identifier, routeType: "conversation"};
  }
  if (conversationMarker === 2 && segments[0] === "g") {
    return {identifier, routeType: "project-conversation"};
  }
  return null;
}

function privacy() {
  return {
    rawSessionReturned: false,
    submittedUrlReturned: false,
    extractedIdentifierReturned: false,
    persistedByApplication: false,
  };
}

export function createConversationUrlProbeReport(meta, args, options) {
  const observedAt = nowIso(options);
  const parsed = parseConversationUrl(args?.conversationUrl);
  const session = meta?.["openai/session"];
  const sessionAvailable = typeof session === "string" && session.length > 0;

  if (!parsed) {
    return {
      schemaVersion: 1,
      status: "unsupported_url_format",
      observedAt,
      sessionAvailable,
      urlRecognized: false,
      routeType: null,
      checks: null,
      classification: "unavailable",
      privacy: privacy(),
      limitations: [
        "Only HTTPS chatgpt.com conversation URLs without query strings or fragments are accepted.",
        "No submitted URL or extracted identifier was returned or persisted.",
      ],
    };
  }

  if (!sessionAvailable) {
    return {
      schemaVersion: 1,
      status: "identifier_unavailable",
      observedAt,
      sessionAvailable: false,
      urlRecognized: true,
      routeType: parsed.routeType,
      checks: null,
      classification: "unavailable",
      privacy: privacy(),
      limitations: [
        "ChatGPT did not supply openai/session metadata to this tool call.",
        "No submitted URL or extracted identifier was returned or persisted.",
      ],
    };
  }

  const exactMatch = session === parsed.identifier;
  const versionPrefixedMatch = session === `v1/${parsed.identifier}`;
  const containsConversationId = session.includes(parsed.identifier);
  const terminalIdentifier = session.split(/[/:]/).at(-1);
  const terminalIdentifierMatch = terminalIdentifier === parsed.identifier;

  let status = "not_a_match";
  let classification = "unrelated_anonymized_id";
  if (exactMatch) {
    status = "verified_match";
    classification = "exact_conversation_id";
  } else if (versionPrefixedMatch) {
    status = "verified_match";
    classification = "v1_prefixed_conversation_id";
  } else if (terminalIdentifierMatch) {
    status = "verified_match";
    classification = "terminal_conversation_id";
  } else if (containsConversationId) {
    status = "inconclusive";
    classification = "contains_conversation_id";
  }

  return {
    schemaVersion: 1,
    status,
    observedAt,
    sessionAvailable: true,
    urlRecognized: true,
    routeType: parsed.routeType,
    checks: {
      exactMatch,
      versionPrefixedMatch,
      containsConversationId,
      terminalIdentifierMatch,
    },
    classification,
    privacy: privacy(),
    limitations: [
      "This diagnostic compares one invocation and does not establish a permanent OpenAI contract.",
      "A negative result does not prove that no undocumented relationship exists.",
      "No raw session, submitted URL, or extracted identifier was returned or persisted.",
    ],
  };
}
