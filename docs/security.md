---
layout: page
title: Security
permalink: /security/
---

# Security

Thread Fingerprint is deliberately small and read-only. It exposes one MCP
tool, does not accept user input, does not persist observations, and does not
include raw host metadata in its responses.

## Reporting a vulnerability

Please report suspected vulnerabilities privately through GitHub's
**Security → Report a vulnerability** workflow for the
`jaireaux/thread-fingerprint` repository.

Do not include real ChatGPT metadata values in public issues. Redact raw
`openai/session`, `openai/subject`, and `openai/organization` values.

For operational questions that are not security-sensitive, use the repository's
public issue tracker.
