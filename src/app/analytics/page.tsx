import { AnalyticsDesk } from "@/components/AnalyticsDesk";
import { PageFrame, PageHero } from "@/components/PageHero";
import { LEGAL, PRODUCT } from "@/lib/site";

export default function AnalyticsPage() {
  return (
    <main>
      <PageHero
        compact
        kicker="Flow"
        title="Analytics"
        lede={`Volume, liquidity, and repeat-buy wallets from DexScreener plus explorer transfers. Proxies, not a full ledger. Catalog ${PRODUCT.toolCount}.`}
      />
      <PageFrame>
        <AnalyticsDesk />
        <p className="text-xs leading-relaxed text-ivory/70">{LEGAL.data}</p>
      </PageFrame>
    </main>
  );
}
