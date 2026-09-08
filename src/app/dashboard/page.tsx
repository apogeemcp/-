import { Suspense } from "react";
import { DeskLive } from "@/components/DeskLive";
import { PageFrame, PageHero } from "@/components/PageHero";
import { ScanBox } from "@/components/ScanBox";
import { GuidePanel } from "@/components/InfoBits";
import { GUIDES } from "@/lib/copy";
import { CANONICAL_MCP, PRODUCT } from "@/lib/site";

export const metadata = {
  title: "Desk",
  description: "Scan tickers, trending pools, Stock Token premiums, and pons launches on Robinhood Chain.",
};

export default function DashboardPage() {
  return (
    <main>
      <PageHero
        kicker="Desk"
        title="Mission control"
        focus="desk"
        lede={`Live Robinhood Chain scan, trending, Stock Token desk, and pons. MCP ${CANONICAL_MCP} — ${PRODUCT.toolCount} catalog operations.`}
      />
      <PageFrame>
        <GuidePanel title={GUIDES.desk.title} body={GUIDES.desk.body} href="/guides" />
        <Suspense fallback={<p className="text-ivory/70">Loading scan…</p>}>
          <ScanBox />
        </Suspense>
        <DeskLive />
      </PageFrame>
    </main>
  );
}
