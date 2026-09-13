---
name: thread-fingerprint
description: Identify or verify the current ChatGPT conversation using a privacy-minimized fingerprint. Use when the user asks for a thread ID, conversation fingerprint, continuity check, or whether two observations came from the same conversation.
---

# Thread Fingerprint

Use the `identify_thread` MCP tool once when the user asks to identify or verify the current conversation.

When the user supplies a `TFP1-NMCP-XXXX-XXXX-XXXX-XXXX` legacy reference, pass it as `legacyReference`. Describe the direction precisely: the current conversation references the legacy conversation. The relationship is user asserted. The current fingerprint is host-derived; the legacy reference is format-checked but not validated from host metadata.

## Rules

- Report the short display fingerprint first.
- Provide the full SHA-256 fingerprint only when the user needs to record or compare it.
- Never describe the fingerprint as the visible conversation title or URL.
- Never claim it is permanent. It is an observation derived from ChatGPT's anonymized conversation metadata.
- Do not infer or request conversation content.
- Do not persist the fingerprint or send it to another service unless the user explicitly asks.
- If the tool reports `unavailable`, explain that this host did not supply the required metadata and use the user's existing recovery workflow instead.
- If `identify_thread` is not present as a callable tool, state that the failure occurred before MCP invocation and label it as a host-side tool-availability failure. Do not claim to know whether the cause is conversation age, plugin identity, permissions, caching, or surface support.
- If `identify_thread` is not callable, generate a fresh opaque value containing 16 uppercase hexadecimal characters and format it as `TFP1-NMCP-XXXX-XXXX-XXXX-XXXX`. Do not derive it from conversation content, a title, or a URL. Do not describe it as random, cryptographic, deterministic, unique, or host validated.
- Return two simple prompts with that exact reference already substituted: one prompt that asks the current legacy conversation for a complete handoff, and one prompt for a separate new conversation that carries the handoff and invokes Thread Fingerprint.
- State that the new conversation references the legacy conversation. Do not imply that ChatGPT branches, connects, or modifies either conversation.
- Do not describe nonexistent controls such as "Create legacy reference," and do not promise that ChatGPT will display a copy button.
- In the separate new conversation, call `identify_thread` with the NMCP reference and preserve the relationship as user asserted.
- For comparisons, equality supports "same observed conversation identifier"; inequality supports "different observed conversation identifier." Do not infer why an identifier changed.

## Host-side tool-unavailable response

When the plugin is recognized but `identify_thread` is not callable, use error
`TFP-HOST-TOOL-UNAVAILABLE`. Substitute one fresh NMCP reference everywhere
`<legacy-reference>` appears and return this workflow:

1. Explain that ChatGPT did not make the action available, so no MCP request was
   made and the exact cause cannot be determined.
2. State that the user must create a separate new conversation that references
   the legacy conversation. Explicitly say this does not branch, connect, or
   modify the legacy conversation.
3. Provide this prompt for the current legacy conversation:

```text
Create a complete handoff for this conversation.

Use this provisional legacy reference:
<legacy-reference>

Include the current objective, completed work, important decisions, unresolved issues, relevant files and links, and the exact next step.

State clearly that this legacy reference was not validated through MCP.
```

4. Tell the user to copy the resulting handoff. Provide this prompt for a
   separate new conversation:

```text
This new conversation references legacy conversation:
<legacy-reference>

Use Thread Fingerprint to identify this new conversation. Report the relationship in this direction:

[new host-derived fingerprint] references [legacy NMCP reference]

Then continue from the handoff pasted below.

[Paste the complete handoff from the legacy conversation here.]
```

5. Explain that the NMCP value is a provisional, non-MCP reference supplied by
   the user. The new conversation points back to the legacy conversation; no
   branch or live connection is created. Tell the user to keep the legacy
   conversation until the new fingerprint and handoff are verified.
