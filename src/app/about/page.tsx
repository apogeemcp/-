import { PageFrame, PageHero } from "@/components/PageHero";
import { ABOUT } from "@/lib/copy";
import { CANONICAL_MCP, LEGAL, PRODUCT } from "@/lib/site";
import Link from "next/link";

export const metadata = {
  title: "About",
  description: "What Apogee is: Robinhood Chain intel, MCP tools, and Orbit — not a custodian.",
};

export default function AboutPage() {
  return (
    <main>
      <PageHero
        compact
        focus="orbit"
        kicker="About"
        title="Apogee"
        lede="Trading intelligence and MCP tools for Robinhood Chain — market data, token analytics, pons launches, wallet marks, and Orbit in one ecosystem. No custody. No invented numbers."
        action={
          <>
            <Link href="/connect" className="btn-primary">
              Add MCP
            </Link>
            <Link href="/orbit" className="btn-ghost">
              Open Orbit
            </Link>
          </>
        }
      />
      <PageFrame>
        {ABOUT.map((s) => (
          <section key={s.title} className="glass-2 p-6 sm:p-8">
            <h2 className="font-heading text-2xl text-ivory">{s.title}</h2>
            <p className="mt-3 text-sm leading-relaxed text-ivory/80 sm:text-base">{s.body}</p>
          </section>
        ))}
        <p className="text-sm text-ivory/75">
          Live MCP {CANONICAL_MCP} · {PRODUCT.toolCount} operations · {LEGAL.affiliation}
        </p>
      </PageFrame>
    </main>
  );
}
