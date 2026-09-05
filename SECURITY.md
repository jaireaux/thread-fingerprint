# Security Policy

## Supported versions

Only the latest prerelease or release is supported.

## Security boundary

Thread Fingerprint is read-only and stateless. It hashes `openai/session` in memory and returns only the resulting fingerprint. It does not intentionally log or persist request bodies, raw identifiers, fingerprints, conversation content, headers, location, user identity, or organization identity.

Infrastructure providers may process ordinary request metadata under their own policies.

## Reporting a vulnerability

Open a GitHub security advisory for sensitive reports. Do not post raw ChatGPT metadata, conversation fingerprints, session values, access tokens, IP addresses, or personal information in a public issue.

For non-sensitive problems, use the repository issue tracker.
