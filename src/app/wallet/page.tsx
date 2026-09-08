import { Suspense } from "react";
import { WalletDesk } from "@/components/WalletDesk";
import { PageFrame, PageHero } from "@/components/PageHero";
import { LEGAL } from "@/lib/site";

export default function WalletPage() {
  return (
    <main>
      <PageHero
        compact
        kicker="Profile · wallet"
        title="Profile"
        lede="Connect Phantom or paste any 0x address. Holdings, mark-to-market USD, and explorer flow on Robinhood Chain — one place for wallet and portfolio."
      />
      <PageFrame>
        <Suspense fallback={<p className="text-ivory/70">Loading profile…</p>}>
          <WalletDesk />
        </Suspense>
        <p className="text-xs leading-relaxed text-ivory/65">{LEGAL.keys}</p>
      </PageFrame>
    </main>
  );
}
