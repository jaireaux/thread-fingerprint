import assert from "node:assert/strict";
import test from "node:test";
import {MARKER, createServer} from "../server.mjs";

async function post(base, body, headers = {}) {
  const response = await fetch(`${base}/mcp`, {
    method: "POST",
    headers: {"content-type": "application/json", ...headers},
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

test("lists exactly one read-only diagnostic tool", async (t) => {
  const base = await fixture(t);
  const {body} = await post(base, {jsonrpc: "2.0", id: 1, method: "tools/list"});
  assert.equal(body.result.tools.length, 1);
  assert.equal(body.result.tools[0].name, "inspect_context");
  assert.equal(body.result.tools[0].annotations.readOnlyHint, true);
});

test("returns supplied metadata and redacts credential fields", async (t) => {
  const base = await fixture(t);
  const {body} = await post(base, {
    jsonrpc: "2.0",
    id: 2,
    method: "tools/call",
    params: {
      name: "inspect_context",
      arguments: {marker: MARKER},
      _meta: {
        "openai/locale": "en-US",
        "openai/subject": "opaque-subject",
        access_token: "must-not-leak",
      },
    },
  }, {authorization: "Bearer must-not-leak", "x-test-surface": "local-test"});
  const report = body.result.structuredContent;
  assert.equal(report.toolCall.meta["openai/locale"], "en-US");
  assert.equal(report.toolCall.meta["openai/subject"], "opaque-subject");
  assert.equal(report.toolCall.meta.access_token, "[REDACTED]");
  assert.equal(report.transport.headers.authorization, "[REDACTED]");
  assert.equal(report.transport.headers["x-test-surface"], "local-test");
  assert.equal(JSON.stringify(report).includes("must-not-leak"), false);
});

test("rejects the wrong stable marker", async (t) => {
  const base = await fixture(t);
  const {body} = await post(base, {
    jsonrpc: "2.0",
    id: 3,
    method: "tools/call",
    params: {name: "inspect_context", arguments: {marker: "wrong"}},
  });
  assert.equal(body.error.code, -32602);
});
