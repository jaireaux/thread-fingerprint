export const LEGACY_REFERENCE_PREFIX = "TFP1-NMCP";
export const LEGACY_REFERENCE_PATTERN = /^TFP1-NMCP(?:-[A-F0-9]{4}){4}$/;

export function normalizeLegacyReference(reference) {
  if (typeof reference !== "string") {
    throw new TypeError("legacyReference must be a string.");
  }
  const normalized = reference.trim().toUpperCase();
  if (!LEGACY_REFERENCE_PATTERN.test(normalized)) {
    throw new TypeError("legacyReference must use TFP1-NMCP-XXXX-XXXX-XXXX-XXXX format.");
  }
  return normalized;
}

export function createLegacyReference(options) {
  if (typeof options?.randomBytes !== "function") {
    throw new TypeError("A randomBytes function is required.");
  }

  const bytes = options.randomBytes(8);
  if (!(bytes instanceof Uint8Array) || bytes.length !== 8) {
    throw new TypeError("randomBytes must return exactly 8 bytes.");
  }

  const value = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  const groups = value.toUpperCase().match(/.{4}/g);

  return {
    schemaVersion: 1,
    kind: "provisional-legacy-reference",
    algorithm: "CSPRNG-64",
    source: "local-random-generation",
    value,
    display: `${LEGACY_REFERENCE_PREFIX}-${groups.join("-")}`,
    validation: "not-host-validated",
  };
}
