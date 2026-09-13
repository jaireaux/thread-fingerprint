---
layout: page
title: Security
permalink: /security/
---

# Security

Thread Fingerprint is deliberately small and read-only. It exposes one MCP
tool, does not persist observations, and does not include raw host metadata in
its responses. The tool accepts only one optional user value: a strictly
formatted `TFP1-NMCP` legacy reference. It does not accept a working URL or raw
conversation identifier.

## Reporting a vulnerability

Please report suspected vulnerabilities privately through GitHub's
**Security → Report a vulnerability** workflow for the
`jaireaux/thread-fingerprint` repository.

Do not include real ChatGPT metadata values in public issues. Redact raw
`openai/session`, `openai/subject`, and `openai/organization` values.

For operational questions that are not security-sensitive, use the repository's
public issue tracker.
