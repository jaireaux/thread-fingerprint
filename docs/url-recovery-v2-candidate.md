# Conversation URL Recovery — v2 Candidate

Status: design candidate; not implemented or deployed.

## Why this is separate from fingerprinting

Thread Fingerprint currently promises that `identify_thread` will not return the raw
`openai/session` value or a conversation URL. URL recovery has a different privacy
boundary and must not silently change that contract.

Existing `TFP1` values and the behavior of `identify_thread` must remain unchanged.

## Hypothesis

The host-provided `openai/session` value may contain, or may be derived from, the
identifier used in a private ChatGPT conversation URL:

```text
https://chatgpt.com/c/<conversation-id>
```

This relationship is not documented and must be tested rather than assumed. The
fingerprint cannot be reversed; comparison must happen while the server is handling
the original host metadata.

## Preliminary non-invasive comparison

On October 15, 2026, the production `identify_thread` result for a known
project-contained conversation was compared locally against hashes of narrowly
defined representations of that conversation's visible URL identifier.

The returned fingerprint did not match the SHA-256 of:

- the visible conversation identifier by itself;
- `v1/<conversation-id>`;
- the visible `/c/<conversation-id>` path;
- the shortened ChatGPT conversation URL; or
- the complete project-contained conversation URL.

No URL, raw identifier, or fingerprint value was committed. This result rules out
simple reconstruction from the existing fingerprint. It does not rule out a
relationship hidden inside the raw `openai/session` value, so any further test
requires the staging-only in-memory comparison described below.

## Proposed staging-only tool

Working name: `verify_conversation_url`

Input:

```json
{
  "conversationUrl": "https://chatgpt.com/c/..."
}
```

The tool would:

1. Validate that the supplied value is an HTTPS URL on an explicitly allowed ChatGPT
   hostname and has a supported `/c/<identifier>` path.
2. Read the current call's host-provided `openai/session` value in memory.
3. Compare the URL identifier with the session value using narrowly defined,
   testable comparison strategies.
4. Return a result without returning or logging the raw session value, URL, or
   extracted conversation identifier.
5. Discard all input and intermediate values after the request.

Proposed result states:

| Result | Meaning |
| --- | --- |
| `verified_match` | The supplied URL identifier matched the current host metadata under a named comparison rule. |
| `not_a_match` | A usable host identifier was present, but it did not match the supplied URL. |
| `identifier_unavailable` | ChatGPT did not supply usable `openai/session` metadata. |
| `unsupported_url_format` | The supplied URL was not an allowed, recognizable conversation URL. |
| `inconclusive` | Both inputs were usable, but the relationship could not be evaluated safely. |

A successful comparison verifies only that invocation. It does not establish a
permanent OpenAI contract.

## Comparison rules

The implementation must enumerate each accepted rule in code and tests. It must not
use broad substring matching.

Candidate rules to test, in order:

1. Exact equality between the URL identifier and the session value.
2. Exact equality after removing one explicitly recognized version prefix from the
   session value.
3. Exact equality with one explicitly parsed terminal UUID-like segment.

No rule should be enabled merely because it produces a plausible-looking URL.
Any normalization must be documented and covered by positive and negative fixtures.

## Privacy and security requirements

- The capability is opt-in and invoked explicitly.
- Keep it separate from `identify_thread`.
- Never return the raw session value, submitted URL, or extracted identifier.
- Never place those values in errors, traces, analytics, application logs, or
  persistence.
- Do not make an outbound request to the supplied URL.
- Treat the URL as sensitive even though possession of it does not necessarily grant
  access to the conversation.
- Retain the current no-database and no-application-logging design.
- Update the privacy policy, security policy, tool description, and submission
  disclosures before any public release.
- Mark the tool read-only, non-destructive, idempotent, and closed-world.

## Validation plan

Test on staging only.

1. Invoke the tool inside a conversation while supplying that same conversation's
   copied URL; expect `verified_match`.
2. Supply a different known conversation URL; expect `not_a_match`.
3. Repeat the matching test across at least three distinct conversations.
4. When available, repeat across macOS, iPadOS, and web hosts.
5. Confirm that serialized responses and application logs contain none of the raw
   session, URL, or extracted identifier.
6. Confirm that `identify_thread` still returns the same `TFP1` value before and
   after the experiment.
7. Confirm safe results for missing metadata, malformed URLs, unexpected hostnames,
   query strings, fragments, and future session formats.

## Release gate

Do not call this a URL-recovery feature or include it in production unless all of
the following are true:

- matching succeeds consistently across multiple distinct conversations;
- mismatched URLs are reliably rejected;
- no raw identifier or URL is exposed or persisted;
- the privacy and security documentation is updated;
- ChatGPT-hosted testing confirms the staging behavior;
- the user explicitly approves production deployment.

If the relationship cannot be established reliably, keep the outcome documented as
`unavailable` and do not construct or return candidate URLs.

## Versioning note

This is a product-level "v2 candidate" because it adds a new privacy-sensitive
capability. The repository is currently at `0.2.0-pre.1`, so the eventual semantic
version should be chosen only after the v1 release path is settled. Possible release
numbers include a `0.3.0` experimental build, `1.1.0` after a stable v1, or
`2.0.0` if the project intentionally treats the new privacy contract as a major
generation.
