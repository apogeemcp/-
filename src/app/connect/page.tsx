import { ConnectPanel } from "@/components/ConnectPanel";
import { GuidePanel } from "@/components/InfoBits";
import { PageFrame, PageHero } from "@/components/PageHero";
import { GUIDES } from "@/lib/copy";
import { CANONICAL_MCP, LEGAL, PRODUCT } from "@/lib/site";

export const metadata = {
  title: "Connect MCP",
  description: `Add ${CANONICAL_MCP} to Cursor, Claude, ChatGPT, or Grok. Auth none.`,
};

export default function ConnectPage() {
  return (
    <main>
      <PageHero
        kicker="Setup · auth none"
        title="Connect"
        lede={`${CANONICAL_MCP} — ${PRODUCT.toolCount} operations. One-click Cursor; paste the same URL into Claude, ChatGPT, or Grok with authentication set to none.`}
      />
      <PageFrame>
        <GuidePanel title={GUIDES.mcp.title} body={GUIDES.mcp.body} href="/guides" />
        <ConnectPanel />
        <p className="text-xs leading-relaxed text-ivory/70">{LEGAL.keys}</p>
      </PageFrame>
    </main>
  );
}
