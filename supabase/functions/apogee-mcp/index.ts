import { cors, json, runTool, TOOLS, logUsage } from "../_shared/apogee.ts";

const INSTRUCTIONS = `You are connected to Apogee, the Robinhood Chain intel MCP (Search / Chart / Desk / Launch). Chain 4663, DexScreener slug robinhood. Resolve by contract. Read-only. Never ask for keys.`;

function ok(id: unknown, result: unknown) {
  return { jsonrpc: "2.0", id: id ?? null, result };
}
function err(id: unknown, code: number, message: string) {
  return { jsonrpc: "2.0", id: id ?? null, error: { code, message } };
}

async function handle(msg: any): Promise<unknown | null> {
  const id = msg?.id ?? null;
  const method = msg?.method || "";
  if (method.startsWith("notifications/")) return null;
  if (method === "initialize") {
    return ok(id, {
      protocolVersion: "2025-03-26",
      capabilities: { tools: { listChanged: false } },
      serverInfo: { name: "apogee", version: "1.0.0" },
      instructions: INSTRUCTIONS,
    });
  }
  if (method === "ping") return ok(id, {});
  if (method === "tools/list") return ok(id, { tools: TOOLS });
  if (method === "tools/call") {
    const name = msg?.params?.name;
    const args = msg?.params?.arguments || {};
    try {
      const result = await runTool(name, args);
      logUsage(name, String(args.query || args.address || args.symbol || ""), true);
      return ok(id, { content: [{ type: "text", text: JSON.stringify(result, null, 2) }], structuredContent: result });
    } catch (e) {
      logUsage(name, "", false);
      return ok(id, { content: [{ type: "text", text: JSON.stringify({ ok: false, error: String(e) }) }], isError: true });
    }
  }
  return err(id, -32601, `Method not found: ${method}`);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method === "GET") {
    return json({ name: "apogee", transport: "streamable-http", auth: "none", tools: TOOLS.length });
  }
  const body = await req.json().catch(() => ({}));
  if (Array.isArray(body)) {
    const out = [];
    for (const item of body) {
      const r = await handle(item);
      if (r) out.push(r);
    }
    if (!out.length) return new Response(null, { status: 202, headers: cors });
    return json(out);
  }
  const r = await handle(body);
  if (r == null) return new Response(null, { status: 202, headers: cors });
  return json(r);
});
