import { catalogEntry, searchCatalog, CATALOG_SIZE, buildCatalog } from "./catalog";
import { toolImpl } from "./intel";
import { mcpHttpUrl, installLinks } from "./site";
import { logUsage } from "./usage";

const META_TOOLS = new Set(["run_tool", "invoke_catalog"]);
const MAX_NEST = 2;

export async function dispatchTool(name: string, args: Record<string, unknown> = {}, depth = 0): Promise<unknown> {
  const n = String(name || "").trim();
  if (!n) throw new Error("Missing tool name");
  if (depth > MAX_NEST) throw new Error("Tool nesting too deep");
  const query = String(args.query || args.address || args.symbol || args.q || "");
  try {
    const result = await run(n, args, depth);
    logUsage(n, query, result && typeof result === "object" && "ok" in result ? Boolean((result as { ok?: boolean }).ok) : true);
    return result;
  } catch (error) {
    logUsage(n, query, false);
    throw error;
  }
}

async function run(n: string, args: Record<string, unknown>, depth: number): Promise<unknown> {
  if (n === "search_catalog") {
    const hits = searchCatalog(String(args.query || args.q || ""), Number(args.limit || 40));
    return { ok: true, catalogSize: CATALOG_SIZE, matches: hits.map((t) => ({ name: t.name, description: t.description, family: t.family, impl: t.impl })) };
  }
  if (META_TOOLS.has(n)) {
    const inner = String(args.name || args.op || args.tool || "");
    if (META_TOOLS.has(inner) || inner === "search_catalog") throw new Error("Cannot nest catalog meta-tools");
    const innerArgs = (args.arguments as Record<string, unknown>) || { ...args };
    delete innerArgs.name;
    delete innerArgs.op;
    delete innerArgs.tool;
    delete innerArgs.arguments;
    return dispatchTool(inner, innerArgs, depth + 1);
  }
  if (n === "list_catalog_page") {
    const offset = Math.max(0, Number(args.offset || 0));
    const limit = Math.min(100, Math.max(1, Number(args.limit || 50)));
    const all = buildCatalog();
    return {
      ok: true,
      total: all.length,
      offset,
      tools: all.slice(offset, offset + limit).map((t) => ({ name: t.name, description: t.description, family: t.family })),
    };
  }

  const direct = (toolImpl as Record<string, (a: Record<string, unknown>) => unknown>)[n];
  if (direct) return direct(args);

  const entry = catalogEntry(n);
  if (entry) {
    const impl = (toolImpl as Record<string, (a: Record<string, unknown>) => unknown>)[entry.impl];
    if (!impl) throw new Error(`Catalog impl missing: ${entry.impl}`);
    return impl({ ...entry.bound, ...args });
  }
  throw new Error(`Unknown tool: ${n}`);
}

export function httpStatusForToolError(message: string): number {
  if (/unknown tool|missing tool name/i.test(message)) return 404;
  if (/too deep|nest catalog|invalid|need a |provide a 0x/i.test(message)) return 400;
  return 500;
}

export function listedMcpTools() {
  const links = installLinks();
  return {
    url: mcpHttpUrl(),
    catalogSize: CATALOG_SIZE,
    listed: Object.keys(toolImpl).length,
    install: links,
  };
}
