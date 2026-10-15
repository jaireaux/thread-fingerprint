import assert from "node:assert/strict";
import test from "node:test";
import {
  createConversationUrlProbeReport,
  parseConversationUrl,
} from "../lib/url-probe.mjs";

const id = "11111111-2222-4333-8444-555555555555";
const projectUrl = `https://chatgpt.com/g/g-p-example-thread-fingerprint/c/${id}`;
const now = () => new Date("2026-10-15T21:45:52.054Z");

test("parses ordinary and project-contained conversation URLs", () => {
  assert.deepEqual(parseConversationUrl(`https://chatgpt.com/c/${id}`), {
    identifier: id,
    routeType: "conversation",
  });
  assert.deepEqual(parseConversationUrl(projectUrl), {
    identifier: id,
    routeType: "project-conversation",
  });
});

test("rejects share links, lookalike hosts, credentials, queries, and fragments", () => {
  for (const value of [
    `https://chatgpt.com/share/${id}`,
    `https://chatgpt.com.example/c/${id}`,
    `https://user@chatgpt.com/c/${id}`,
    `https://chatgpt.com/c/${id}?source=test`,
    `https://chatgpt.com/c/${id}#fragment`,
  ]) {
    assert.equal(parseConversationUrl(value), null);
  }
});

test("recognizes exact, version-prefixed, and terminal matches", () => {
  const cases = [
    [id, "exact_conversation_id"],
    [`v1/${id}`, "v1_prefixed_conversation_id"],
    [`opaque/session/${id}`, "terminal_conversation_id"],
  ];
  for (const [session, classification] of cases) {
    const report = createConversationUrlProbeReport(
      {"openai/session": session},
      {conversationUrl: projectUrl},
      {now},
    );
    assert.equal(report.status, "verified_match");
    assert.equal(report.classification, classification);
  }
});

test("labels a non-terminal containment match inconclusive", () => {
  const report = createConversationUrlProbeReport(
    {"openai/session": `opaque-${id}-suffix`},
    {conversationUrl: projectUrl},
    {now},
  );
  assert.equal(report.status, "inconclusive");
  assert.equal(report.classification, "contains_conversation_id");
  assert.equal(report.checks.containsConversationId, true);
  assert.equal(report.checks.terminalIdentifierMatch, false);
});

test("reports unrelated anonymized identifiers without leaking either input", () => {
  const rawSession = "v1/independent-anonymized-session";
  const report = createConversationUrlProbeReport(
    {"openai/session": rawSession},
    {conversationUrl: projectUrl},
    {now},
  );
  assert.equal(report.status, "not_a_match");
  assert.equal(report.classification, "unrelated_anonymized_id");
  const serialized = JSON.stringify(report);
  assert.equal(serialized.includes(rawSession), false);
  assert.equal(serialized.includes(projectUrl), false);
  assert.equal(serialized.includes(id), false);
});

test("fails safely when session metadata is missing", () => {
  const report = createConversationUrlProbeReport(
    {},
    {conversationUrl: projectUrl},
    {now},
  );
  assert.equal(report.status, "identifier_unavailable");
  assert.equal(report.sessionAvailable, false);
  assert.equal(report.checks, null);
});

test("rejects unsupported URLs without returning the input", () => {
  const shareUrl = `https://chatgpt.com/share/${id}`;
  const report = createConversationUrlProbeReport(
    {"openai/session": "opaque-session"},
    {conversationUrl: shareUrl},
    {now},
  );
  assert.equal(report.status, "unsupported_url_format");
  assert.equal(report.urlRecognized, false);
  assert.equal(JSON.stringify(report).includes(shareUrl), false);
});
