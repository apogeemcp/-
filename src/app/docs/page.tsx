import { PageFrame, PageHero } from "@/components/PageHero";
import { GuidePanel } from "@/components/InfoBits";
import { ToolsIndex } from "@/components/ToolsIndex";
import { GUIDES } from "@/lib/copy";
import { MCP_INSTRUCTIONS } from "@/lib/tools";
import { LEGAL, PRODUCT, mcpHttpUrl } from "@/lib/site";

export default function DocsPage() {
  const http = mcpHttpUrl();
  return (
    <main>
      <PageHero
        compact
        kicker="Reference"
        title="MCP tools"
        lede={`${http} · ${PRODUCT.toolCount} catalog operations. Last updated ${LEGAL.updated}. Generated from the live tool list — no invented tools.`}
      />
      <PageFrame>
        <GuidePanel title={GUIDES.mcp.title} body={GUIDES.mcp.body} href="/connect" />
        <pre className="panel whitespace-pre-wrap rounded-xl p-5 font-mono text-[11px] leading-relaxed text-ivory/75">
          {MCP_INSTRUCTIONS}
        </pre>
        <ToolsIndex />
      </PageFrame>
    </main>
  );
}
