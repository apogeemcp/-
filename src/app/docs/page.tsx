import { PageFrame, PageHero } from "@/components/PageHero";
import { ToolsIndex } from "@/components/ToolsIndex";
import { MCP_INSTRUCTIONS } from "@/lib/tools";
import { LEGAL, PRODUCT, mcpHttpUrl } from "@/lib/site";

export default function DocsPage() {
  const http = mcpHttpUrl();
  return (
    <main>
      <PageHero
        compact
        kicker="Reference"
        title="Tools"
        lede={`${http} · ${PRODUCT.toolCount} catalog operations. Last updated ${LEGAL.updated}. Every listed tool hits the live MCP backend.`}
      />
      <PageFrame>
        <pre className="panel whitespace-pre-wrap rounded-xl p-5 font-mono text-[11px] leading-relaxed text-ivory/75">
          {MCP_INSTRUCTIONS}
        </pre>
        <ToolsIndex />
      </PageFrame>
    </main>
  );
}
