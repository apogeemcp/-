import { Suspense } from "react";
import { DeskLive } from "@/components/DeskLive";
import { PageFrame, PageHero } from "@/components/PageHero";
import { ScanBox } from "@/components/ScanBox";
import { CANONICAL_MCP, PRODUCT } from "@/lib/site";

export default function DashboardPage() {
  return (
    <main>
      <PageHero
        kicker="Desk"
        title="Mission control"
        lede={`Live Robinhood Chain scan, trending, Stock Token desk, and pons. MCP ${CANONICAL_MCP} — ${PRODUCT.toolCount} catalog operations.`}
      />
      <PageFrame>
        <Suspense fallback={<p className="text-ivory/50">Loading scan…</p>}>
          <ScanBox />
        </Suspense>
        <DeskLive />
      </PageFrame>
    </main>
  );
}
