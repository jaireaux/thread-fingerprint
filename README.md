# Thread Metadata Diagnostic

Stable marker: `DSHS-THREAD-METADATA-DIAGNOSTIC`

Version 0.1.0-pre.2 is deliberately limited to one read-only MCP tool:
`inspect_context`. It reports only what the current tool call and server
runtime can legitimately observe:

- tool arguments;
- the MCP `params._meta` object;
- sanitized HTTP method, path, version, and request headers;
- Node.js version, operating system, and architecture.

It does not read conversation messages, call another service, mutate anything,
write logs, or persist observations. Known credential-bearing fields and proxy-forwarded client IP headers are
returned as `[REDACTED]`.

## Run locally

Requires Node.js 18 or later and has no package dependencies.

```sh
npm test
npm start
```

The server listens at `http://127.0.0.1:8787/mcp`; `/health` is a simple
health check. The included `.mcp.json` points the local plugin at that endpoint.

## Test from ChatGPT Developer Mode

ChatGPT must reach the MCP endpoint over public HTTPS. Deploy this directory on
an HTTPS-capable Node host, set `HOST=0.0.0.0`, and point the developer-mode MCP
connection to `https://YOUR-HOST/mcp`. Do not add OAuth or data storage for this
first experiment.

Invoke `inspect_context` with:

```json
{"marker":"DSHS-THREAD-METADATA-DIAGNOSTIC"}
```

Save the returned JSON exactly for the compatibility matrix. A missing title,
ID, or URL means only that it was not exposed to this call on that tested
surface; it does not prove that no internal identifier exists.

## Security boundary

This diagnostic intentionally returns request metadata to the caller that sent
it. Do not place it on a public URL without an access-control layer unless the
URL is temporary and unguessable. Stop and review before adding persistence,
conversation content, account access, mutation, or broader automation.

## First-result checklist

For each surface, record the date/time, client/surface, endpoint version, MCP
protocol version, exact returned schema, and whether the response contains a
conversation title, conversation ID, conversation URL, client/surface hint,
device/platform hint, or other stable opaque subject. Treat undocumented fields
as experimental, never as a sole DSHS dependency.

## Development timing

As of prerelease `0.1.0-pre.2`, this project has been in development for approximately 1 hour 15 minutes, beginning `2026-09-05 12:23 EDT`. Approximately 26 minutes was spent waiting on AI. These are user-approved approximate baselines; methodology and machine-readable values are retained in `project-timing.json`.
