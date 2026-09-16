---
name: thread-fingerprint-legacy-rescue
description: Create a provisional non-MCP reference and handoff prompts for an older or unsupported ChatGPT conversation. Use when the user asks to rescue, migrate, or continue a conversation where Thread Fingerprint or developer MCP tools are unavailable. Do not use when identify_thread is callable and a host-derived fingerprint can be obtained normally.
---

# Thread Fingerprint Legacy Rescue

This is a skills-only recovery path. Do not call an MCP tool, request a private conversation URL, or imply that the reference is host validated.

When invoked, create one fresh opaque token containing exactly 16 uppercase hexadecimal characters and format it as:

`TFP1-NMCP-XXXX-XXXX-XXXX-XXXX`

Use the same token everywhere in the response. Do not derive it from conversation content, title, URL, user identity, or another identifier. Do not describe it as random, cryptographic, deterministic, permanent, unique, authenticated, or MCP validated.

Return the following response, replacing `<legacy-reference>` with the generated token.

## Required response

Begin with:

**Diagnostic Error:** `TFP-HOST-TOOL-UNAVAILABLE`

Explain that Thread Fingerprint could not obtain a host-derived fingerprint because `identify_thread` was not callable in this conversation. No MCP request was made through this rescue plugin, and the exact cause cannot be determined from the conversation.

State:

**Provisional legacy reference:** `<legacy-reference>`

Explain that the user should create a separate new conversation that references this legacy conversation. Explicitly state that this does not branch, connect, or modify the legacy conversation.

Provide these two prompts as separate fenced `text` blocks so ChatGPT supplies a copy control.

### Prompt 1 — use in this legacy conversation

```text
Create a complete handoff for this conversation.

Use this provisional legacy reference:
<legacy-reference>

Include the current objective, completed work, important decisions, unresolved issues, relevant files and links, and the exact next step.

State clearly that this legacy reference was not validated through MCP.
```

### Prompt 2 — use in a separate new conversation

```text
This new conversation references legacy conversation:
<legacy-reference>

Use Thread Fingerprint to identify this new conversation. Report the relationship in this direction:

[new host-derived fingerprint] references [legacy NMCP reference]

Then continue from the handoff pasted below.

[Paste the complete handoff from the legacy conversation here.]
```

Finish by stating that the NMCP value is a provisional, non-MCP reference supplied by the user. The new conversation points back to the legacy conversation; no branch or live connection is created. Tell the user to keep the legacy conversation until the new fingerprint and handoff are verified.

Do not mention nonexistent controls such as “Create legacy reference.” Do not tell the user to find or expose the conversation URL. Do not claim to diagnose why the developer MCP tool was unavailable.
