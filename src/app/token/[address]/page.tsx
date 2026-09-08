import { TokenView } from "@/components/TokenView";
import { PageFrame, PageHero } from "@/components/PageHero";
import { isAddress } from "@/lib/chain";

export default async function TokenPage({ params }: { params: Promise<{ address: string }> }) {
  const { address } = await params;
  const ok = isAddress(address);
  return (
    <main>
      <PageHero
        compact
        kicker="Token terminal"
        title={ok ? "Market" : "Unknown token"}
        lede={ok ? `${address} on Robinhood Chain. Live DexScreener, explorer, and pons factory reads — no fabricated fields.` : "Provide a 0x contract."}
      />
      <PageFrame>{ok ? <TokenView address={address} /> : <p className="text-sm text-flare">Invalid address.</p>}</PageFrame>
    </main>
  );
}
