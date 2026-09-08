import { ToolDirectory } from "@/components/ToolDirectory";
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
      <ToolDirectory />
    </div>
  );
}
