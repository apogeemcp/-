import { Suspense } from "react";
import { WalletDesk } from "@/components/WalletDesk";
import { PageFrame, PageHero } from "@/components/PageHero";
import { GuidePanel } from "@/components/InfoBits";
import { GUIDES } from "@/lib/copy";
import { LEGAL } from "@/lib/site";

export const metadata = {
  title: "Profile",
  description: "Mark-to-market wallet holdings on Robinhood Chain. Connect Phantom or paste a 0x address.",
};

export default function WalletPage() {
  return (
    <main>
      <PageHero
        compact
        focus="profile"
        kicker="Profile · wallet"
        title="Profile"
        lede="Connect Phantom or paste any 0x address. Holdings, mark-to-market USD, and explorer flow on Robinhood Chain — one place for wallet and portfolio."
      />
      <PageFrame>
        <GuidePanel title={GUIDES.profile.title} body={GUIDES.profile.body} href="/guides" />
        <Suspense fallback={<p className="text-ivory/70">Loading profile…</p>}>
          <WalletDesk />
        </Suspense>
        <p className="text-xs leading-relaxed text-ivory/65">{LEGAL.keys}</p>
      </PageFrame>
    </main>
  );
}
