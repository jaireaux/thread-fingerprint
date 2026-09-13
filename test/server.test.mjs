import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import test from "node:test";
import {createServer} from "../server.mjs";

async function post(base, body) {
  const response = await fetch(`${base}/mcp`, {
    method: "POST",
    headers: {"content-type": "application/json"},
    body: JSON.stringify(body),
  });
  return {response, body: response.status === 202 ? null : await response.json()};
}

async function fixture(t) {
  const server = createServer().listen(0, "127.0.0.1");
  t.after(() => server.close());
  await new Promise((resolve) => server.once("listening", resolve));
  return `http://127.0.0.1:${server.address().port}`;
}

function call(id, session, extraMeta = {}) {
  return {
    jsonrpc: "2.0",
    id,
    method: "tools/call",
    params: {
      name: "identify_thread",
      arguments: {},
      _meta: {
        "openai/session": session,
        ...extraMeta,
      },
    },
  };
}

test("lists exactly one read-only thread identification tool", async (t) => {
  const base = await fixture(t);
  const {body} = await post(base, {jsonrpc: "2.0", id: 1, method: "tools/list"});
  assert.equal(body.result.tools.length, 1);
  assert.equal(body.result.tools[0].name, "identify_thread");
  assert.equal(body.result.tools[0].annotations.readOnlyHint, true);
  assert.equal(
    body.result.tools[0].inputSchema.properties.legacyReference.pattern,
    "^TFP1-NMCP(?:-[A-Fa-f0-9]{4}){4}$",
  );
});

test("returns a deterministic fingerprint without raw identifiers", async (t) => {
  const base = await fixture(t);
  const rawSession = "v1/example-private-session";
  const {body} = await post(base, call(2, rawSession, {
    "openai/subject": "private-subject",
    "openai/organization": "private-organization",
    "openai/userLocation": {country: "US"},
    callId: "private-call-id",
  }));

  const report = body.result.structuredContent;
  const expected = createHash("sha256").update(rawSession).digest("hex");
  assert.equal(report.status, "available");
  assert.equal(report.fingerprint.value, expected);
  assert.equal(report.fingerprint.display, `TFP1-${expected.slice(0, 16).toUpperCase().match(/.{1,4}/g).join("-")}`);
  assert.equal(report.privacy.rawSessionReturned, false);
  assert.equal(report.privacy.subjectReturned, false);
  assert.equal(report.privacy.organizationReturned, false);
  const serialized = JSON.stringify(body.result);
  for (const privateValue of [
    rawSession,
    "private-subject",
    "private-organization",
    "private-call-id",
    "openai/subject",
    "openai/organization",
    "openai/userLocation",
  ]) {
    assert.equal(serialized.includes(privateValue), false);
  }
});

test("same conversation is stable and different conversations differ", async (t) => {
  const base = await fixture(t);
  const first = (await post(base, call(3, "session-a"))).body.result.structuredContent;
  const repeat = (await post(base, call(4, "session-a"))).body.result.structuredContent;
  const other = (await post(base, call(5, "session-b"))).body.result.structuredContent;
  assert.equal(first.fingerprint.value, repeat.fingerprint.value);
  assert.notEqual(first.fingerprint.value, other.fingerprint.value);
});

test("fails safely when openai/session is absent", async (t) => {
  const base = await fixture(t);
  const {body} = await post(base, {
    jsonrpc: "2.0",
    id: 6,
    method: "tools/call",
    params: {name: "identify_thread", arguments: {}, _meta: {}},
  });
  const report = body.result.structuredContent;
  assert.equal(report.status, "unavailable");
  assert.equal(report.fingerprint, null);
  assert.match(report.reason, /did not supply openai\/session/);
});

test("records a directional reference without claiming host validation", async (t) => {
  const base = await fixture(t);
  const message = call(8, "current-session");
  message.params.arguments = {
    legacyReference: "tfp1-nmcp-44eb-ca72-2881-7d67",
  };
  const {body} = await post(base, message);
  const report = body.result.structuredContent;

  assert.equal(report.status, "available");
  assert.deepEqual(report.continuity, {
    legacyReference: "TFP1-NMCP-44EB-CA72-2881-7D67",
    relationship: "current-conversation-references-legacy",
    legacyReferenceValidated: false,
    currentFingerprintValidated: true,
  });
  assert.match(body.result.content[0].text, /current conversation references the legacy conversation/);
  assert.match(body.result.content[0].text, /not validated from host metadata/);
});

test("rejects malformed legacy references and unexpected arguments", async (t) => {
  const base = await fixture(t);
  const malformed = call(9, "current-session");
  malformed.params.arguments = {legacyReference: "TFP1-NMCP-TOO-SHORT"};
  const malformedResponse = await post(base, malformed);
  assert.equal(malformedResponse.body.error.code, -32602);

  const unexpected = call(10, "current-session");
  unexpected.params.arguments = {conversationUrl: "https://chatgpt.com/c/private"};
  const unexpectedResponse = await post(base, unexpected);
  assert.equal(unexpectedResponse.body.error.code, -32602);
});

test("rejects unknown tools", async (t) => {
  const base = await fixture(t);
  const {body} = await post(base, {
    jsonrpc: "2.0",
    id: 7,
    method: "tools/call",
    params: {name: "inspect_context", arguments: {}},
  });
  assert.equal(body.error.code, -32602);
});
