import { ConnectPanel } from "@/components/ConnectPanel";
import { PageFrame, PageHero } from "@/components/PageHero";
import { CANONICAL_MCP, LEGAL, PRODUCT } from "@/lib/site";

export default function ConnectPage() {
  return (
    <main>
      <PageHero
        kicker="Setup · auth none"
        title="Connect"
        lede={`${CANONICAL_MCP} — ${PRODUCT.toolCount} operations. One-click Cursor; paste the same URL into Claude, ChatGPT, or Grok with authentication set to none.`}
      />
      <PageFrame>
        <ConnectPanel />
        <p className="text-xs leading-relaxed text-ivory/40">{LEGAL.keys}</p>
      </PageFrame>
    </main>
  );
}
