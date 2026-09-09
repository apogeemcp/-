import { PageFrame, PageHero } from "@/components/PageHero";
import { OnchainComposer } from "@/components/OnchainComposer";
import { OnchainActivityFeed } from "@/components/OnchainActivityFeed";
import { GuidePanel } from "@/components/InfoBits";
import { GUIDES } from "@/lib/copy";
import { SERVICE_WALLET_PUBLIC } from "@/lib/onchain-config";

export const metadata = {
  title: "On-chain notes",
  description: "Write permanent notes to Solana. Each qualifying memo queues about $0.02 of $ORBITX buy-and-burn.",
};

export default function OnchainNotesPage() {
  return (
    <main>
      <PageHero
        kicker="On-chain notes"
        title="Write permanent notes directly to Solana"
        focus="desk"
        lede="The Apogee service wallet records your text as a Solana memo, then buys and burns about $0.02 of $ORBITX. The page reads those confirmed transactions from chain. Nothing is fabricated."
      />
      <PageFrame>
        <GuidePanel title={GUIDES.onchain.title} body={GUIDES.onchain.body} href="/developers/onchain" />
        <p className="mb-6 mt-4 text-sm text-ivory/70">
          Service wallet{" "}
          <a className="font-mono text-ember" href={`https://solscan.io/account/${SERVICE_WALLET_PUBLIC}`} target="_blank" rel="noreferrer">
            {SERVICE_WALLET_PUBLIC}
          </a>
          . Do not put secrets or personal information in a memo — it is permanent and public.
        </p>
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <OnchainComposer />
          <OnchainActivityFeed />
        </div>
      </PageFrame>
    </main>
  );
}
