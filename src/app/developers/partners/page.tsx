import { PartnerForm } from "@/components/PartnerForm";
import { PARTNER_TYPES } from "@/lib/access";
import { CANONICAL_MCP, LEGAL } from "@/lib/site";
import Link from "next/link";

export const metadata = {
  title: "Partners",
  description: "Build on Apogee MCP instead of re-indexing Robinhood Chain. Partnership requests are stored for review — not a paid MCP checkout.",
};

export default function PartnersPage() {
  return (
    <div className="space-y-8">
      <header>
        <p className="kicker">Partnerships</p>
        <h1 className="mt-2 font-display text-4xl text-ivory sm:text-5xl">Build on Apogee</h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-ivory/80 sm:text-base">
          Apogee can be the data and tool layer under someone else’s product. MCP is already public at {CANONICAL_MCP}.
          Use this form if you want a direct partnership conversation — volume, branding, or support. It does not sell
          access and does not grant extra tools.
        </p>
      </header>

      <ul className="grid gap-2 sm:grid-cols-2">
        {PARTNER_TYPES.map((t) => (
          <li key={t} className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-ivory/80">
            {t}
          </li>
        ))}
      </ul>

      <PartnerForm />

      <p className="text-xs text-ivory/55">
        Prefer to integrate immediately?{" "}
        <Link href="/connect" className="text-ember hover:text-ivory">
          Add MCP
        </Link>{" "}
        ·{" "}
        <Link href="/developers/access" className="text-ember hover:text-ivory">
          Access status
        </Link>
      </p>
      <p className="text-xs text-ivory/55">{LEGAL.counsel}</p>
    </div>
  );
}
