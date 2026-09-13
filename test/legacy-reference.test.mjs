import assert from "node:assert/strict";
import test from "node:test";
import {
  createLegacyReference,
  normalizeLegacyReference,
} from "../lib/legacy-reference.mjs";

test("creates a URL-free provisional NMCP reference from eight random bytes", () => {
  const reference = createLegacyReference({
    randomBytes(length) {
      assert.equal(length, 8);
      return Uint8Array.from([0x44, 0xeb, 0xca, 0x72, 0x28, 0x81, 0x7d, 0x67]);
    },
  });

  assert.deepEqual(reference, {
    schemaVersion: 1,
    kind: "provisional-legacy-reference",
    algorithm: "CSPRNG-64",
    source: "local-random-generation",
    value: "44ebca7228817d67",
    display: "TFP1-NMCP-44EB-CA72-2881-7D67",
    validation: "not-host-validated",
  });
});

test("requires exactly eight random bytes", () => {
  assert.throws(() => createLegacyReference({}), /randomBytes/);
  assert.throws(
    () => createLegacyReference({randomBytes: () => new Uint8Array(7)}),
    /exactly 8 bytes/,
  );
});

test("normalizes valid NMCP references and rejects malformed values", () => {
  assert.equal(
    normalizeLegacyReference("tfp1-nmcp-abcd-0123-4567-89ef"),
    "TFP1-NMCP-ABCD-0123-4567-89EF",
  );
  assert.throws(
    () => normalizeLegacyReference("TFP1-NMCP-ABCD-0123-4567"),
    /TFP1-NMCP/,
  );
});
