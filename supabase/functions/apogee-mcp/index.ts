import { cors, json } from "../_shared/apogee.ts";

const UPSTREAM = Deno.env.get("APOGEE_UPSTREAM_MCP") || "https://apogeemcp.digital/api/mcp";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method === "GET") {
    return json({
      name: "apogee",
      transport: "streamable-http",
      auth: "none",
      tools: 3000,
      url: UPSTREAM,
      note: "Canonical MCP is https://apogeemcp.digital/api/mcp — this function proxies it.",
    });
  }
  const body = await req.text();
  const res = await fetch(UPSTREAM, {
    method: "POST",
    headers: { "content-type": "application/json", "mcp-protocol-version": "2025-03-26" },
    body: body || "{}",
  });
  const text = await res.text();
  return new Response(text, {
    status: res.status,
    headers: { ...cors, "Content-Type": "application/json", "mcp-protocol-version": "2025-03-26" },
  });
});
