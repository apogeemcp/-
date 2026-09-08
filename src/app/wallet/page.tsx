import { WalletDesk } from "@/components/WalletDesk";
import { PageFrame, PageHero } from "@/components/PageHero";
import { LEGAL } from "@/lib/site";

export default function WalletPage() {
  return (
    <main>
      <PageHero
        compact
        kicker="Track"
        title="Wallet"
        lede="Connect Phantom or paste any 0x address. Balances, mark-to-market USD, and explorer flow on Robinhood Chain."
      />
      <PageFrame>
        <WalletDesk />
        <p className="text-xs leading-relaxed text-ivory/40">{LEGAL.keys}</p>
      </PageFrame>
    </main>
  );
}
