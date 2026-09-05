---
layout: default
title: Thread Fingerprint
permalink: /
---

# Thread Fingerprint

Thread Fingerprint is a small, read-only ChatGPT plugin that creates a deterministic one-way fingerprint for the current conversation.

## What it does

When explicitly invoked, the plugin uses ChatGPT's documented anonymized conversation metadata to calculate a SHA-256 fingerprint. Repeated calls with the same observed conversation identifier produce the same fingerprint; different identifiers produce different fingerprints.

## What it does not do

Thread Fingerprint does not read conversation content, visible titles, conversation URLs, user identity, organization identity, location, or unrelated request metadata. It has no application database and does not persist observations.

## Intended use

Use the fingerprint as an optional correlator alongside a human-approved thread name and another recovery reference. It is not a permanent identity guarantee, and it cannot locate or reopen a conversation by itself.

## Source and documentation

The source code, releases, security policy, and issue tracker are available in the [GitHub repository](https://github.com/jaireaux/thread-fingerprint).

- [Privacy policy](privacy/)
- [Terms of service](terms/)
- [Support](support/)
