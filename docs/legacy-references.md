---
layout: default
title: Legacy conversation references
permalink: /legacy-references/
---

# Legacy conversation references

Some existing ChatGPT conversations recognize an installed plugin mention but do not expose its MCP action. In that condition, Thread Fingerprint cannot read host metadata because ChatGPT does not call the MCP server.

An NMCP reference is a provisional label for such a legacy conversation:

```text
TFP1-NMCP-XXXX-XXXX-XXXX-XXXX
```

`NMCP` means the reference was not produced or validated from MCP host metadata. It is not a fingerprint of the conversation, its URL, or its contents.

## Generation

Creating an NMCP reference requires no conversation URL or identifier. The repository's command-line helper generates eight cryptographically random bytes and formats the resulting 16 hexadecimal characters into four groups.

The failure-response workflow may also provide a fresh opaque value in the same format. That value remains provisional and must not be described as cryptographically derived or host validated.

## Direction of the reference

The user copies the same NMCP reference into a handoff from the legacy conversation and into a separate new conversation. If the new conversation can invoke `identify_thread`, the result records this direction:

```text
[current host-derived fingerprint] references [legacy NMCP reference]
```

This is a user assertion. It does not branch, modify, or create a live connection to the legacy conversation. The current conversation's ordinary `TFP1` fingerprint is host-derived; the legacy NMCP reference remains unvalidated.

## Local generation

From a checked-out copy of the repository, run:

```sh
npm run legacy-reference
```

The utility performs no network request and prints only the provisional reference and its validation status.
