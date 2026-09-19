import assert from "node:assert/strict";
import {existsSync, readFileSync} from "node:fs";
import path from "node:path";
import test from "node:test";
import {fileURLToPath} from "node:url";

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const pluginRoot = path.join(
  repositoryRoot,
  "plugins",
  "thread-fingerprint-legacy-rescue",
);

test("legacy rescue universal manifest references complete local assets", () => {
  const manifest = JSON.parse(
    readFileSync(path.join(pluginRoot, ".codex-plugin", "plugin.json"), "utf8"),
  );

  assert.equal(manifest.name, "thread-fingerprint-legacy-rescue");
  assert.equal(manifest.skills, "./skills/");
  assert.equal(manifest.mcpServers, undefined);
  assert.equal(manifest.apps, undefined);
  assert.equal(manifest.interface.defaultPrompt.length, 3);

  for (const field of ["composerIcon", "logo"]) {
    const relativePath = manifest.interface[field];
    assert.match(relativePath, /^\.\/assets\//);
    assert.ok(existsSync(path.join(pluginRoot, relativePath)));
  }
});

test("legacy rescue submission packet includes required review cases", () => {
  const submission = readFileSync(
    path.join(pluginRoot, "SUBMISSION.md"),
    "utf8",
  );

  assert.equal((submission.match(/^### \d+\./gm) ?? []).length, 8);
  assert.match(submission, /## Positive test cases/);
  assert.match(submission, /## Negative test cases/);
  assert.match(submission, /Skills only/);
});

test("legacy rescue skill preserves non-MCP and non-branching language", () => {
  const skill = readFileSync(
    path.join(
      pluginRoot,
      "skills",
      "thread-fingerprint-legacy-rescue",
      "SKILL.md",
    ),
    "utf8",
  );

  assert.match(skill, /TFP-HOST-TOOL-UNAVAILABLE/);
  assert.match(skill, /No MCP request was made/);
  assert.match(skill, /does not branch, connect, or modify/);
  assert.match(skill, /\[new host-derived fingerprint\] references \[legacy NMCP reference\]/);
  assert.doesNotMatch(skill, /Select \*\*Create legacy reference\*\*/);
});
