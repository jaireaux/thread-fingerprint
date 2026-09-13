---
layout: default
title: Privacy Policy
permalink: /privacy/
---

# Privacy Policy

Effective: September 5, 2026

Thread Fingerprint is designed to minimize data handling.

## Data processed

When the tool is invoked, ChatGPT sends host-provided MCP metadata to the server. The application code reads only the documented anonymized `openai/session` value required to calculate a SHA-256 fingerprint.

The application does not intentionally read, return, log, or persist the raw session value, user identifier, organization identifier, location, conversation content, visible title, conversation URL, request headers, or generated fingerprint.

Users may optionally supply a short `TFP1-NMCP` legacy reference when identifying a separate new conversation. The MCP server format-checks and returns that reference as a user assertion that the current conversation references a legacy conversation. It does not store the reference.

The repository's separate command-line generator creates the NMCP reference from eight cryptographically random bytes. It requires no conversation URL, conversation identifier, title, or content and performs no network request.

## Storage and sharing

Thread Fingerprint has no application database, cookies, accounts, OAuth flow, advertising, analytics, or external API calls. The application does not sell or share personal information.

Cloudflare processes requests to operate the MCP endpoint, and GitHub processes visits to this documentation site, under their respective privacy policies. Those providers may retain ordinary security and infrastructure telemetry independently of the application.

## User control

The tool runs only when selected or invoked through a compatible host. Users may disconnect or uninstall it through their ChatGPT or Codex plugin settings.

## Changes

Material changes will be published in the repository history and reflected by a new effective date.

## Contact

For non-sensitive questions, use the [GitHub issue tracker](https://github.com/jaireaux/thread-fingerprint/issues). Report sensitive security matters privately as described in the repository security policy.
