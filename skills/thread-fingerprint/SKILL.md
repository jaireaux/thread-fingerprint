---
name: thread-fingerprint
description: Identify or verify the current ChatGPT conversation using a privacy-minimized fingerprint. Use when the user asks for a thread ID, conversation fingerprint, continuity check, or whether two observations came from the same conversation.
---

# Thread Fingerprint

Use the `identify_thread` MCP tool once when the user asks to identify or verify the current conversation.

## Rules

- Report the short display fingerprint first.
- Provide the full SHA-256 fingerprint only when the user needs to record or compare it.
- Never describe the fingerprint as the visible conversation title or URL.
- Never claim it is permanent. It is an observation derived from ChatGPT's anonymized conversation metadata.
- Do not infer or request conversation content.
- Do not persist the fingerprint or send it to another service unless the user explicitly asks.
- If the tool reports `unavailable`, explain that this host did not supply the required metadata and use the user's existing recovery workflow instead.
- For comparisons, equality supports "same observed conversation identifier"; inequality supports "different observed conversation identifier." Do not infer why an identifier changed.
