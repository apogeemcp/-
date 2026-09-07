import { cors, json, runTool, TOOLS, logUsage } from "../_shared/apogee.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const url = new URL(req.url);
  if (req.method === "GET" && url.searchParams.size === 0) {
    return json({ ok: true, tools: TOOLS.map((t) => t.name), auth: "none" });
  }
  let tool = url.searchParams.get("tool") || url.pathname.split("/").filter(Boolean).pop() || "";
  if (tool === "apogee-api") tool = "";
  let args: Record<string, unknown> = Object.fromEntries(url.searchParams.entries());
  if (req.method === "POST") {
    const body = await req.json().catch(() => ({})) as Record<string, unknown>;
    tool = String(body.tool || tool);
    args = { ...args, ...((body.arguments as Record<string, unknown>) || body) };
  }
  if (!tool) return json({ ok: false, error: "Provide tool" }, 400);
  try {
    const result = await runTool(tool, args);
    logUsage(tool, String(args.query || args.address || args.symbol || ""), true);
    return json({ ok: true, tool, result });
  } catch (e) {
    logUsage(tool, "", false);
    return json({ ok: false, error: String(e) }, 500);
  }
});
