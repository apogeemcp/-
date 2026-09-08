import { catalogEntry, searchCatalog, CATALOG_SIZE, buildCatalog } from "./catalog";
import { toolImpl } from "./intel";
import { mcpHttpUrl, installLinks } from "./site";

export async function dispatchTool(name: string, args: Record<string, unknown> = {}): Promise<unknown> {
  const n = String(name || "").trim();
  if (!n) throw new Error("Missing tool name");

  if (n === "search_catalog") {
    const hits = searchCatalog(String(args.query || args.q || ""), Number(args.limit || 40));
    return { ok: true, catalogSize: CATALOG_SIZE, matches: hits.map((t) => ({ name: t.name, description: t.description, family: t.family, impl: t.impl })) };
  }
  if (n === "run_tool" || n === "invoke_catalog") {
    const inner = String(args.name || args.op || args.tool || "");
    const innerArgs = (args.arguments as Record<string, unknown>) || { ...args };
    delete innerArgs.name;
    delete innerArgs.op;
    delete innerArgs.tool;
    delete innerArgs.arguments;
    return dispatchTool(inner, innerArgs);
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

export function listedMcpTools() {
  const links = installLinks();
  return {
    url: mcpHttpUrl(),
    catalogSize: CATALOG_SIZE,
    listed: Object.keys(toolImpl).length,
    install: links,
  };
}
