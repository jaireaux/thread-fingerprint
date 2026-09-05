export const FINGERPRINT_VERSION = "TFP1";

export function formatDisplayFingerprint(hex) {
  const short = hex.slice(0, 16).toUpperCase();
  return `${FINGERPRINT_VERSION}-${short.match(/.{1,4}/g).join("-")}`;
}

export async function createThreadFingerprintReport(meta, options) {
  const observedAt = (options?.now ?? (() => new Date()))().toISOString();
  const session = meta?.["openai/session"];

  if (typeof session !== "string" || session.length === 0) {
    return {
      schemaVersion: 1,
      status: "unavailable",
      observedAt,
      fingerprint: null,
      reason: "ChatGPT did not supply openai/session metadata to this tool call.",
      privacy: {
        rawSessionReturned: false,
        subjectReturned: false,
        organizationReturned: false,
        persistedByApplication: false,
      },
      limitations: [
        "Absence in one call does not prove that ChatGPT has no internal conversation identifier.",
        "This utility cannot read the visible conversation title or URL.",
      ],
    };
  }

  const value = await options.digestSession(session);
  return {
    schemaVersion: 1,
    status: "available",
    observedAt,
    fingerprint: {
      version: FINGERPRINT_VERSION,
      algorithm: "SHA-256",
      sourceField: "openai/session",
      value,
      display: formatDisplayFingerprint(value),
    },
    privacy: {
      rawSessionReturned: false,
      subjectReturned: false,
      organizationReturned: false,
      persistedByApplication: false,
    },
    limitations: [
      "This is an anonymized conversation correlator, not a visible title or URL.",
      "OpenAI does not promise permanence across reconnection, plugin recreation, workspace changes, or future versions.",
      "Use it alongside a human-approved name and another recovery reference.",
    ],
  };
}
