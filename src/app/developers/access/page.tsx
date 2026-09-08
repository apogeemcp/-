import { CopyButton } from "@/components/TokenMedia";
import { AccessPlans } from "@/components/AccessPlans";
import { AccessLedger } from "@/components/AccessLedger";
import { ACCESS_AUDIENCE, MCP_ACCESS } from "@/lib/access";
import { CANONICAL_MCP, LEGAL } from "@/lib/site";
import Link from "next/link";

export const metadata = {
  title: "MCP access",
  description:
    "Buy Apogee MCP access by sending SOL or USDC to the Solana treasury, then paste the Solscan transaction link. 25% is allocated to a manual $ORBITX buy-and-burn.",
};

export default function AccessPage() {
  return (
    <div className="space-y-10">
      <header>
        <p className="kicker">Infrastructure marketplace</p>
        <h1 className="mt-2 font-display text-4xl text-ivory sm:text-5xl">Apogee MCP for other products</h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-ivory/80 sm:text-base">
          You do not need users to visit Apogee. Connect {CANONICAL_MCP} (auth none) and bring search, desk, charts,
          wallet marks, and listed tools into your own agent, trading UI, or research app. Paid plans: send SOL or USDC
          to the treasury, then confirm with the Solscan transaction link.
        </p>
      </header>

      <ol className="grid gap-3 sm:grid-cols-2">
        {ACCESS_AUDIENCE.map((a) => (
          <li key={a.who} className="panel rounded-xl p-5">
            <p className="kicker">{a.who}</p>
            <p className="mt-2 text-sm leading-relaxed text-ivory/80">{a.flow}</p>
          </li>
        ))}
      </ol>

      <AccessPlans />
      <AccessLedger />

      <section id="receipts" className="panel rounded-xl p-5">
        <p className="kicker">Receipts</p>
        <p className="mt-2 text-sm text-ivory/75">
          After a verified Solscan payment, this page lists plan, price, access window, 25% buy-and-burn allocation, and
          the payment transaction. Buy-and-burn stays pending until we record that burn.
        </p>
      </section>

      <section id="token" className="panel rounded-xl p-5">
        <p className="kicker">Project contract</p>
        <p className="mt-2 break-all font-mono text-sm text-ivory">{MCP_ACCESS.projectContract}</p>
        <p className="mt-2 text-xs text-ivory/65">
          Copy only. This site does not invent an explorer or claim a verified on-chain burn for {MCP_ACCESS.tokenTicker}.
        </p>
        <div className="mt-3">
          <CopyButton value={MCP_ACCESS.projectContract} label="Copy address" />
        </div>
      </section>

      <p className="text-xs text-ivory/55">{LEGAL.disclaimer}</p>
      <p className="text-xs text-ivory/55">
        <Link href="/developers/auth" className="text-ember hover:text-ivory">
          Authentication
        </Link>{" "}
        remains none until a verified gating path exists.{" "}
        <Link href="/developer-terms" className="text-ember hover:text-ivory">
          Developer terms
        </Link>
        .
      </p>
    </div>
  );
}
