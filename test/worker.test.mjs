import test from "node:test";
import assert from "node:assert/strict";
import {webcrypto} from "node:crypto";
import worker from "../src/worker.mjs";

if (!globalThis.crypto) globalThis.crypto = webcrypto;

const endpoint = "https://thread-fingerprint.example/mcp";

test("Worker health response declares no storage or application logging", async () => {
  const response = await worker.fetch(new Request(
    "https://thread-fingerprint.example/health",
  ));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    ok: true,
    name: "thread-fingerprint",
    version: "0.2.0-pre.1",
    storage: false,
    applicationLogging: false,
  });
});

test("Worker returns a fingerprint without echoing any raw metadata", async () => {
  const rawSession = "v1/example-session-value";
  const rawSubject = "v1/example-subject-value";
  const rawOrganization = "v1/example-organization-value";
  const request = new Request(endpoint, {
    method: "POST",
    headers: {"content-type": "application/json"},
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 7,
      method: "tools/call",
      params: {
        name: "identify_thread",
        arguments: {},
        _meta: {
          "openai/session": rawSession,
          "openai/subject": rawSubject,
          "openai/organization": rawOrganization,
          "openai/unknown-future-field": "must-not-leak",
        },
      },
    }),
  });

  const response = await worker.fetch(request);
  const body = await response.json();
  const serialized = JSON.stringify(body);

  assert.equal(response.status, 200);
  assert.equal(body.result.structuredContent.status, "available");
  assert.match(
    body.result.structuredContent.fingerprint.value,
    /^[a-f0-9]{64}$/,
  );
  for (const secret of [
    rawSession,
    rawSubject,
    rawOrganization,
    "must-not-leak",
  ]) {
    assert.equal(serialized.includes(secret), false);
  }
});

test("Worker returns an explicitly unvalidated directional legacy reference", async () => {
  const rawSession = "v1/current-reference-session";
  const request = new Request(endpoint, {
    method: "POST",
    headers: {"content-type": "application/json"},
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 8,
      method: "tools/call",
      params: {
        name: "identify_thread",
        arguments: {
          legacyReference: "TFP1-NMCP-44EB-CA72-2881-7D67",
        },
        _meta: {"openai/session": rawSession},
      },
    }),
  });

  const response = await worker.fetch(request);
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(
    body.result.structuredContent.continuity.legacyReference,
    "TFP1-NMCP-44EB-CA72-2881-7D67",
  );
  assert.equal(
    body.result.structuredContent.continuity.relationship,
    "current-conversation-references-legacy",
  );
  assert.equal(
    body.result.structuredContent.continuity.legacyReferenceValidated,
    false,
  );
  assert.equal(
    body.result.structuredContent.continuity.currentFingerprintValidated,
    true,
  );
  assert.equal(JSON.stringify(body).includes(rawSession), false);
});

test("Worker preflight includes CORS headers", async () => {
  const response = await worker.fetch(new Request(endpoint, {method: "OPTIONS"}));
  assert.equal(response.status, 204);
  assert.equal(response.headers.get("access-control-allow-origin"), "*");
  assert.match(
    response.headers.get("access-control-allow-methods"),
    /POST/,
  );
});
