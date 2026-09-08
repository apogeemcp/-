import { AnalyticsDesk } from "@/components/AnalyticsDesk";
import { GuidePanel } from "@/components/InfoBits";
import { PageFrame, PageHero } from "@/components/PageHero";
import { GUIDES } from "@/lib/copy";
import { LEGAL, PRODUCT } from "@/lib/site";

export default function AnalyticsPage() {
  return (
    <main>
      <PageHero
        compact
        focus="desk"
        kicker="Flow"
        title="Analytics"
        lede={`Volume, liquidity, and repeat-buy wallets from DexScreener plus explorer transfers. Proxies, not a full ledger. Catalog ${PRODUCT.toolCount}.`}
      />
      <PageFrame>
        <GuidePanel title={GUIDES.token.title} body={GUIDES.token.body} href="/guides" />
        <AnalyticsDesk />
        <p className="text-xs leading-relaxed text-ivory/70">{LEGAL.data}</p>
      </PageFrame>
    </main>
  );
}
