---
layout: default
title: Support
permalink: /support/
---

# Support

## Before reporting a problem

Confirm that:

1. The Thread Fingerprint plugin is installed and enabled.
2. The `identify_thread` tool appears as a read action.
3. The host supplied `openai/session` metadata.
4. You are not treating the fingerprint as a visible title or URL.

For Legacy Rescue, confirm that:

1. You installed **Thread Fingerprint Legacy Rescue**, not the production or staging MCP plugin.
2. You started a new conversation after installation so the skill is available.
3. The response contains one `TFP1-NMCP` reference and two copyable prompt blocks.
4. You are not treating the NMCP reference as MCP validated or as proof of conversation identity.

## Reporting problems

Use the [GitHub issue tracker](https://github.com/jaireaux/thread-fingerprint/issues) for non-sensitive reports.

Do not include raw session values, subject or organization identifiers, conversation content, access tokens, IP addresses, or other private metadata in public issues.

For a suspected vulnerability, use GitHub's private security-advisory workflow described in the [security policy](https://github.com/jaireaux/thread-fingerprint/security/policy).
