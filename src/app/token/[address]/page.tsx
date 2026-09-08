import { TokenView } from "@/components/TokenView";
import { GuidePanel } from "@/components/InfoBits";
import { PageFrame, PageHero } from "@/components/PageHero";
import { GUIDES } from "@/lib/copy";
import { isAddress } from "@/lib/chain";

export default async function TokenPage({ params }: { params: Promise<{ address: string }> }) {
  const { address } = await params;
  const ok = isAddress(address);
  return (
    <main>
      <PageHero
        compact
        focus="desk"
        kicker="Token terminal"
        title={ok ? "Market" : "Unknown token"}
        lede={ok ? "Live DexScreener, GeckoTerminal trades, and pons factory reads — no fabricated fields." : "Provide a 0x contract."}
      />
      <PageFrame>
        {ok ? <GuidePanel title={GUIDES.token.title} body={GUIDES.token.body} href="/guides" /> : null}
        {ok ? <TokenView address={address} /> : <p className="text-sm text-flare">Invalid address.</p>}
      </PageFrame>
    </main>
  );
}
