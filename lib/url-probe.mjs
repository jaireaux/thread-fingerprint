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

function hexToBase64(hex) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  const bytes = [];
  for (let index = 0; index < hex.length; index += 2) {
    bytes.push(Number.parseInt(hex.slice(index, index + 2), 16));
  }

  let encoded = "";
  for (let index = 0; index < bytes.length; index += 3) {
    const first = bytes[index];
    const second = bytes[index + 1];
    const third = bytes[index + 2];
    const combined = (first << 16) | ((second ?? 0) << 8) | (third ?? 0);
    encoded += alphabet[(combined >>> 18) & 63];
    encoded += alphabet[(combined >>> 12) & 63];
    encoded += second === undefined ? "=" : alphabet[(combined >>> 6) & 63];
    encoded += third === undefined ? "=" : alphabet[combined & 63];
  }
  return encoded;
}

function timingSafeEqual(left, right) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

function emptyTransformationChecks() {
  const encodings = () => ({hex: false, base64: false, base64url: false});
  return {
    conversationId: encodings(),
    versionPrefixedConversationId: encodings(),
    conversationPath: encodings(),
    canonicalConversationUrl: encodings(),
    suppliedConversationUrl: encodings(),
  };
}

async function createTransformationChecks(session, parsed, suppliedUrl, digestText) {
  const checks = emptyTransformationChecks();
  if (typeof digestText !== "function") return checks;

  const comparableSessions = session.startsWith("v1/")
    ? [session, session.slice(3)]
    : [session];
  const candidates = {
    conversationId: parsed.identifier,
    versionPrefixedConversationId: `v1/${parsed.identifier}`,
    conversationPath: `/c/${parsed.identifier}`,
    canonicalConversationUrl: `https://chatgpt.com/c/${parsed.identifier}`,
    suppliedConversationUrl: suppliedUrl,
  };

  for (const [name, candidate] of Object.entries(candidates)) {
    const hex = await digestText(candidate);
    const base64 = hexToBase64(hex);
    const encoded = {
      hex,
      base64,
      base64url: base64.replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, ""),
    };
    for (const [encoding, value] of Object.entries(encoded)) {
      checks[name][encoding] = comparableSessions.some((sessionValue) => (
        timingSafeEqual(sessionValue, value)
      ));
    }
  }
  return checks;
}

function hasTransformationMatch(checks) {
  return Object.values(checks).some((encodings) => (
    Object.values(encodings).some(Boolean)
  ));
}

export async function createConversationUrlProbeReport(meta, args, options) {
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
      transformationChecks: null,
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
      transformationChecks: null,
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
  const transformationChecks = await createTransformationChecks(
    session,
    parsed,
    args.conversationUrl,
    options?.digestSession,
  );
  const transformationMatch = hasTransformationMatch(transformationChecks);

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
  } else if (transformationMatch) {
    status = "verified_match";
    classification = "sha256_derived_conversation_id";
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
    transformationChecks,
    classification,
    privacy: privacy(),
    limitations: [
      "This diagnostic compares one invocation and does not establish a permanent OpenAI contract.",
      "A negative result does not prove that no undocumented relationship exists.",
      "Transformation checks cover only documented SHA-256 candidate encodings and do not test secret or salted derivations.",
      "No raw session, submitted URL, or extracted identifier was returned or persisted.",
    ],
  };
}
