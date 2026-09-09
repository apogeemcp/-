import Link from "next/link";
import { OnchainActivityFeed } from "@/components/OnchainActivityFeed";
import { SERVICE_WALLET_PUBLIC } from "@/lib/onchain-config";

export default function DevelopersOnchainPage() {
  return (
    <div className="space-y-8">
      <header>
        <p className="kicker">On-chain notes</p>
        <h1 className="mt-2 font-display text-4xl text-ivory">Memos, buys, burns</h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-ivory/80">
          Agents call <span className="font-mono text-gold">write_onchain_note</span> on the public MCP. The website
          uses the same backend. The service wallet signs; clients never see a private key. Repeat{" "}
          <span className="font-mono">idempotencyKey</span> to avoid a second memo or burn.
        </p>
      </header>
      <div className="flex flex-wrap gap-2">
        <Link href="/onchain-notes" className="btn-primary">
          Open composer
        </Link>
        <a className="btn-ghost" href={`https://solscan.io/account/${SERVICE_WALLET_PUBLIC}`} target="_blank" rel="noreferrer">
          Service wallet on Solscan
        </a>
      </div>
      <OnchainActivityFeed compact />
    </div>
  );
}
