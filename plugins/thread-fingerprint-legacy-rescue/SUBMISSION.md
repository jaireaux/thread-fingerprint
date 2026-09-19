# Thread Fingerprint Legacy Rescue — submission packet

This packet accompanies the initial universal Plugins Directory submission.

## Submission type

**Skills only.** The plugin does not include an MCP server, app integration, authentication flow, browser extension, hook, or external API call.

Create the upload bundle with:

```sh
npm run package:legacy-rescue
```

Upload `dist/thread-fingerprint-legacy-rescue-skill-0.1.0.zip` in the submission portal's Skills section. Upload `assets/logo.png` separately as the listing logo.

## Public listing

- **Name:** Thread Fingerprint Legacy Rescue
- **Short description:** Create a provisional legacy handoff reference.
- **Category:** Productivity
- **Website:** https://jaireaux.github.io/thread-fingerprint/legacy-references/
- **Support:** https://jaireaux.github.io/thread-fingerprint/support/
- **Privacy:** https://jaireaux.github.io/thread-fingerprint/privacy/
- **Terms:** https://jaireaux.github.io/thread-fingerprint/terms/

### Long description

Thread Fingerprint Legacy Rescue helps move an older or unsupported ChatGPT conversation into a separate new conversation when the normal `identify_thread` action is unavailable. It creates an explicitly provisional, non-MCP legacy reference and two copyable prompts: one for producing a complete handoff in the legacy conversation and one for continuing from that handoff in a separate new conversation. It does not identify, branch, connect, modify, or validate the legacy conversation.

## Starter prompts

1. Rescue this legacy conversation.
2. Create a handoff reference for this old chat.
3. Help me continue this chat in a new conversation.

## Positive test cases

### 1. Direct rescue request

- **Prompt:** `Rescue this legacy conversation.`
- **Expected behavior:** Invoke the Legacy Rescue skill, generate one formatted NMCP reference, and use the same reference throughout the response.
- **Expected result shape:** Diagnostic heading, provisional reference, explanation, two fenced `text` prompts, and closing limitations.
- **Fixture data:** None.

### 2. Older conversation cannot call Thread Fingerprint

- **Prompt:** `Thread Fingerprint is installed, but this old conversation cannot call identify_thread. Help me move it to a new chat.`
- **Expected behavior:** Explain that no MCP request was made, avoid diagnosing the unavailable host action, and produce the legacy handoff workflow.
- **Expected result shape:** One NMCP reference and two copyable prompts.
- **Fixture data:** `identify_thread` is not callable in the test conversation.

### 3. Request for a handoff reference

- **Prompt:** `Create a provisional reference so a new conversation can refer back to this one.`
- **Expected behavior:** Generate a new `TFP1-NMCP-XXXX-XXXX-XXXX-XXXX` value and describe the relationship as new-to-legacy.
- **Expected result shape:** The new-conversation prompt states `[new host-derived fingerprint] references [legacy NMCP reference]`.
- **Fixture data:** None.

### 4. Explicit non-branching migration

- **Prompt:** `I do not want to branch this chat. Give me the safe Legacy Rescue handoff instead.`
- **Expected behavior:** State that the workflow creates a separate new conversation and does not branch, connect, or modify the legacy conversation.
- **Expected result shape:** Two fenced prompts with one consistent provisional reference.
- **Fixture data:** None.

### 5. Simple instructions for a nontechnical user

- **Prompt:** `I am not technical. Help me continue this old conversation somewhere new.`
- **Expected behavior:** Use plain language, supply copyable prompts, and avoid asking for a conversation URL or identifier.
- **Expected result shape:** Concise instructions plus two fenced `text` blocks.
- **Fixture data:** None.

## Negative test cases

### 1. Host-derived fingerprint is available

- **Prompt:** `Identify this conversation with Thread Fingerprint.`
- **Scenario:** `identify_thread` is callable.
- **Expected behavior:** Do not invoke Legacy Rescue; use the normal Thread Fingerprint workflow instead.
- **Why:** A host-derived fingerprint is preferable when the host action is available.

### 2. Request to validate the NMCP value

- **Prompt:** `Generate an NMCP reference and certify that it proves this conversation's identity.`
- **Expected behavior:** Decline to characterize the value as validated, authenticated, unique, permanent, or proof of identity; explain its provisional role.
- **Why:** An NMCP reference is user asserted and not derived from host metadata.

### 3. Request for private URL extraction

- **Prompt:** `Read the private conversation URL and derive the legacy reference from it.`
- **Expected behavior:** Do not request, expose, or use the URL. Generate an opaque provisional reference without deriving it from conversation data.
- **Why:** The workflow intentionally avoids private conversation URLs and identifiers.

## Availability

Initial requested availability: United States. Expand only after the publisher confirms that support, policy pages, and applicable terms are ready for additional regions.

## Release notes

Initial submission of a skills-only recovery workflow for unsupported legacy conversations. The plugin generates an explicitly non-MCP provisional reference and prepares two copyable prompts for a user-controlled handoff into a separate new conversation. It sends no data to an external service and requires no account or authentication.

## Reviewer notes

- The plugin intentionally makes no MCP request.
- The provisional reference is not a fingerprint, proof of identity, or durable platform identifier.
- The plugin never asks for a private conversation URL.
- The plugin does not branch or modify conversations.
- No test account, credentials, or fixture data are required.
