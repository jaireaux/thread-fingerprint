# Thread Fingerprint

Thread Fingerprint is a privacy-minimized, read-only MCP utility that produces a deterministic fingerprint for the current ChatGPT conversation.

It derives a SHA-256 value from ChatGPT's documented anonymized `openai/session` metadata. It does **not** return the raw session value, user identity, organization identity, location, request headers, runtime metadata, conversation content, visible title, or conversation URL.

## What it returns

- a full SHA-256 fingerprint for exact registry matching;
- a short `TFP1-XXXX-XXXX-XXXX-XXXX` display fingerprint;
- an observation timestamp;
- explicit privacy properties and stability limitations.

The application has no database, cookies, OAuth, application logging, or external API calls. It does not persist observations.

## Important limitation

The fingerprint is an optional conversation correlator, not a permanent identity guarantee. Use it with a human-approved name and another recovery reference. OpenAI may change or omit the underlying metadata.

Some existing conversations may recognize the plugin mention without exposing its MCP action. Because no request reaches Thread Fingerprint in that condition, the plugin cannot recover a host-derived fingerprint for the older conversation.

For those conversations, a provisional reference can be generated in the format `TFP1-NMCP-XXXX-XXXX-XXXX-XXXX`. It requires no conversation URL and is explicitly not validated from MCP host metadata. The same reference is carried into a separate new conversation so the new conversation can state that it references the legacy conversation.

## Local development

The standalone MCP server and test suite require Node.js 18 or later and have no runtime package dependencies. Cloudflare deployment uses the pinned Wrangler 4.129.0 development dependency, which requires Node.js 22 or later in the build environment.

```sh
npm test
npm start
npm run legacy-reference
```

The local endpoint is `http://127.0.0.1:8787/mcp`; health information is available at `/health`.

## Cloudflare Worker

The Worker entry point is `src/worker.mjs`, configured by `wrangler.jsonc`. Deployment requires a Cloudflare account:

```sh
npx wrangler login
npx wrangler deploy
```

After deployment, replace the local URL in `.mcp.json` with the reviewed production endpoint before packaging or submission.

## Plugin

The repository root is an installable plugin package containing:

- the `identify_thread` MCP tool;
- an optional, directional record that the current host-derived fingerprint references an NMCP legacy reference;
- a small generic usage skill;
- manifest metadata;
- GitHub Pages source under `docs/`.

## Documentation

- [Project site](https://jaireaux.github.io/thread-fingerprint/)
- [Legacy conversation references](https://jaireaux.github.io/thread-fingerprint/legacy-references/)
- [Privacy](https://jaireaux.github.io/thread-fingerprint/privacy/)
- [Terms](https://jaireaux.github.io/thread-fingerprint/terms/)
- [Support](https://jaireaux.github.io/thread-fingerprint/support/)
- [Security](SECURITY.md)

## Historical diagnostic

Versions `0.1.0-pre.1` and `0.1.0-pre.2` were private diagnostic builds used to establish which metadata ChatGPT supplied. The public utility deliberately removes the broad diagnostic response surface.
