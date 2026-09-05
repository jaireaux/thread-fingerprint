import {handleRpc, SERVER_NAME, VERSION} from "../lib/mcp.mjs";

async function digestSession(session) {
  const bytes = new TextEncoder().encode(session);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

const corsHeaders = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, OPTIONS",
  "access-control-allow-headers": "content-type, accept, mcp-protocol-version, mcp-session-id",
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {"content-type": "application/json", ...corsHeaders},
  });
}

export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") {
      return new Response(null, {status: 204, headers: corsHeaders});
    }
    if (request.method === "GET" && url.pathname === "/health") {
      return json({
        ok: true,
        name: SERVER_NAME,
        version: VERSION,
        storage: false,
        applicationLogging: false,
      });
    }
    if (request.method !== "POST" || url.pathname !== "/mcp") {
      return json({error: "Not found"}, 404);
    }

    try {
      const message = await request.json();
      const response = await handleRpc(message, {digestSession});
      return response === null ? new Response(null, {status: 202}) : json(response);
    } catch {
      return json({
        jsonrpc: "2.0",
        id: null,
        error: {code: -32700, message: "Invalid JSON request"},
      }, 400);
    }
  },
};
