import Link from "next/link";
import { PageFrame } from "@/components/PageHero";
import { InstallApp } from "@/components/InstallApp";
import { SaturnBackdrop } from "@/components/SaturnBackdrop";
import { CANONICAL_MCP, LEGAL, PRODUCT } from "@/lib/site";
import { CHAIN } from "@/lib/chain";
import { ABOUT } from "@/lib/copy";

export default function HomePage() {
  return (
    <main>
      <section className="relative isolate min-h-[min(88vh,820px)] overflow-hidden border-b border-gold/15">
        <SaturnBackdrop variant="hero" className="absolute inset-0" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#05040a] via-[#05040a]/72 to-transparent" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#05040a] via-transparent to-[#05040a]/40" />
        <span className="orbit-ring left-[-10%] top-[-20%] h-[120%] w-[70%] opacity-30" />
        <div className="relative mx-auto flex min-h-[min(88vh,820px)] max-w-6xl flex-col justify-end px-5 pb-14 pt-16 sm:px-6">
          <p className="kicker">
            Chain {CHAIN.id} · {PRODUCT.toolCount} operations · auth none · v{PRODUCT.version}
          </p>
          <h1 className="mt-5 max-w-3xl font-display text-5xl font-semibold leading-[0.92] tracking-[0.04em] text-ivory sm:text-7xl">
            Intel for agents on Robinhood Chain.
          </h1>
          <p className="lede mt-6 max-w-xl text-xl leading-relaxed text-ivory/85 sm:text-2xl">
            Search. Chart. Desk. Launch. Track. Add the live MCP, open Orbit, or sign a pons launch in Phantom — keys
            never leave your wallet.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link href="/connect" className="btn-primary">
              Add MCP
            </Link>
            <Link href="/orbit" className="btn-ghost">
              Open Orbit
            </Link>
            <Link href="/dashboard" className="btn-ember">
              Open Desk
            </Link>
            <Link href="/onchain-notes" className="btn-ghost">
              On-chain notes
            </Link>
            <Link href="/onchain-seals" className="btn-ghost">
              Token seals
            </Link>
            <InstallApp />
          </div>
          <p className="mt-7 font-mono text-xs tracking-wide text-gold">{CANONICAL_MCP}</p>
          <dl className="mt-10 grid gap-3 sm:grid-cols-4">
            {[
              ["Network", `${CHAIN.name} ${CHAIN.id}`],
              ["Slug", CHAIN.slug],
              ["Catalog", `${PRODUCT.toolCount} ops`],
              ["Wallet", "Phantom · EIP-1193"],
            ].map(([k, v]) => (
              <div key={k} className="glass-2 px-4 py-3">
                <dt className="text-[10px] uppercase tracking-[0.22em] text-gold/80">{k}</dt>
                <dd className="mt-1 text-sm text-ivory">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <PageFrame>
        <div className="grid gap-3 sm:grid-cols-5">
          {PRODUCT.pillars.map((p, i) => (
            <Link key={p.name} href={p.href} className="panel px-4 py-5">
              <p className="font-mono text-[10px] text-gold/70">0{i + 1}</p>
              <p className="mt-2 font-display text-xl tracking-[0.12em] text-ivory">{p.name}</p>
              <p className="mt-1 text-xs leading-relaxed text-ivory/75">{p.blurb}</p>
            </Link>
          ))}
        </div>
        <section className="relative overflow-hidden glass-2 p-6 sm:p-8">
          <span className="absolute right-[-8%] top-[-40%] h-64 w-64">
            <span className="saturn-orbit inset-0 opacity-40" />
          </span>
          <p className="kicker">What is Apogee?</p>
          <h2 className="mt-2 font-heading text-4xl italic text-ivory sm:text-5xl">{ABOUT[0].title}</h2>
          <p className="mt-4 max-w-3xl text-sm leading-relaxed text-ivory/80">{ABOUT[0].body}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/about" className="btn-ghost">
              About
            </Link>
            <Link href="/faq" className="btn-ghost">
              FAQ
            </Link>
            <Link href="/guides" className="btn-ghost">
              Guides
            </Link>
            <Link href="/developers" className="btn-ghost">
              Developers
            </Link>
            <Link href="/docs" className="btn-ghost">
              MCP tools
            </Link>
          </div>
        </section>
        <p className="text-xs leading-relaxed text-ivory/70">
          {LEGAL.affiliation} {LEGAL.stock} {LEGAL.pons}
        </p>
      </PageFrame>
    </main>
  );
}
