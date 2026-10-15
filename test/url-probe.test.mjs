import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import test from "node:test";
import {
  createConversationUrlProbeReport,
  parseConversationUrl,
} from "../lib/url-probe.mjs";

const id = "11111111-2222-4333-8444-555555555555";
const projectUrl = `https://chatgpt.com/g/g-p-example-thread-fingerprint/c/${id}`;
const now = () => new Date("2026-10-15T21:45:52.054Z");
const digestSession = (value) => Promise.resolve(
  createHash("sha256").update(value, "utf8").digest("hex"),
);
const options = {now, digestSession};

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

test("recognizes exact, version-prefixed, and terminal matches", async () => {
  const cases = [
    [id, "exact_conversation_id"],
    [`v1/${id}`, "v1_prefixed_conversation_id"],
    [`opaque/session/${id}`, "terminal_conversation_id"],
  ];
  for (const [session, classification] of cases) {
    const report = await createConversationUrlProbeReport(
      {"openai/session": session},
      {conversationUrl: projectUrl},
      options,
    );
    assert.equal(report.status, "verified_match");
    assert.equal(report.classification, classification);
  }
});

test("labels a non-terminal containment match inconclusive", async () => {
  const report = await createConversationUrlProbeReport(
    {"openai/session": `opaque-${id}-suffix`},
    {conversationUrl: projectUrl},
    options,
  );
  assert.equal(report.status, "inconclusive");
  assert.equal(report.classification, "contains_conversation_id");
  assert.equal(report.checks.containsConversationId, true);
  assert.equal(report.checks.terminalIdentifierMatch, false);
});

test("reports unrelated anonymized identifiers without leaking either input", async () => {
  const rawSession = "v1/independent-anonymized-session";
  const report = await createConversationUrlProbeReport(
    {"openai/session": rawSession},
    {conversationUrl: projectUrl},
    options,
  );
  assert.equal(report.status, "not_a_match");
  assert.equal(report.classification, "unrelated_anonymized_id");
  const serialized = JSON.stringify(report);
  assert.equal(serialized.includes(rawSession), false);
  assert.equal(serialized.includes(projectUrl), false);
  assert.equal(serialized.includes(id), false);
  for (const candidate of [
    id,
    `v1/${id}`,
    `/c/${id}`,
    `https://chatgpt.com/c/${id}`,
    projectUrl,
  ]) {
    const digest = await digestSession(candidate);
    assert.equal(serialized.includes(digest), false);
    assert.equal(serialized.includes(Buffer.from(digest, "hex").toString("base64")), false);
    assert.equal(serialized.includes(Buffer.from(digest, "hex").toString("base64url")), false);
  }
});

test("matches SHA-256 candidates in hex, base64, and base64url forms", async () => {
  const hex = await digestSession(id);
  const base64 = Buffer.from(hex, "hex").toString("base64");
  const base64url = Buffer.from(hex, "hex").toString("base64url");
  for (const [session, encoding] of [
    [hex, "hex"],
    [base64, "base64"],
    [`v1/${base64url}`, "base64url"],
  ]) {
    const report = await createConversationUrlProbeReport(
      {"openai/session": session},
      {conversationUrl: projectUrl},
      options,
    );
    assert.equal(report.status, "verified_match");
    assert.equal(report.classification, "sha256_derived_conversation_id");
    assert.equal(report.transformationChecks.conversationId[encoding], true);
    assert.equal(JSON.stringify(report).includes(session), false);
  }
});

test("checks each approved SHA-256 source representation", async () => {
  const candidates = {
    versionPrefixedConversationId: `v1/${id}`,
    conversationPath: `/c/${id}`,
    canonicalConversationUrl: `https://chatgpt.com/c/${id}`,
    suppliedConversationUrl: projectUrl,
  };
  for (const [name, candidate] of Object.entries(candidates)) {
    const session = await digestSession(candidate);
    const report = await createConversationUrlProbeReport(
      {"openai/session": session},
      {conversationUrl: projectUrl},
      options,
    );
    assert.equal(report.transformationChecks[name].hex, true);
  }
});

test("fails safely when session metadata is missing", async () => {
  const report = await createConversationUrlProbeReport(
    {},
    {conversationUrl: projectUrl},
    options,
  );
  assert.equal(report.status, "identifier_unavailable");
  assert.equal(report.sessionAvailable, false);
  assert.equal(report.checks, null);
});

test("rejects unsupported URLs without returning the input", async () => {
  const shareUrl = `https://chatgpt.com/share/${id}`;
  const report = await createConversationUrlProbeReport(
    {"openai/session": "opaque-session"},
    {conversationUrl: shareUrl},
    options,
  );
  assert.equal(report.status, "unsupported_url_format");
  assert.equal(report.urlRecognized, false);
  assert.equal(JSON.stringify(report).includes(shareUrl), false);
});
