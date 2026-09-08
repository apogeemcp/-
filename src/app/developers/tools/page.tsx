import { ToolDirectory } from "@/components/ToolDirectory";
import { TOOL_GROUPS } from "@/lib/access";
import { PRODUCT } from "@/lib/site";
import { VERSIONING } from "@/lib/docs";

export default function ToolsDocsPage() {
  return (
    <div className="space-y-5">
      <header>
        <p className="kicker">Reference</p>
        <h1 className="mt-2 font-display text-4xl text-ivory sm:text-5xl">MCP tool directory</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ivory/75">
          Generated from <span className="font-mono">src/lib/tools.ts</span> ({VERSIONING.listedTools} listed tools).
          Catalog aliases ({PRODUCT.toolCount}) are not hard-coded here — use search_catalog and run_tool. Example
          responses are not fabricated.
        </p>
      </header>
      <div className="panel rounded-xl p-4">
        <p className="kicker">Future permission groups</p>
        <p className="mt-2 text-sm text-ivory/75">
          Architecture reserved for per-tool access. Live MCP does not gate by group — every listed tool is public.
        </p>
        <ul className="mt-3 flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.14em] text-ivory/60">
          {TOOL_GROUPS.map((g) => (
            <li key={g} className="rounded-full border border-white/10 px-2 py-1">
              {g}
            </li>
          ))}
        </ul>
      </div>
      <ToolDirectory />
    </div>
  );
}
