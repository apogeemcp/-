import Link from "next/link";
import { BannerArt, PageFrame } from "@/components/PageHero";
import { InstallApp } from "@/components/InstallApp";
import { FirstVisit } from "@/components/FirstVisit";
import { CANONICAL_MCP, LEGAL, PRODUCT } from "@/lib/site";
import { CHAIN } from "@/lib/chain";
import { ABOUT } from "@/lib/copy";

export default function HomePage() {
  return (
    <main>
      <section className="relative isolate min-h-[min(82vh,760px)] overflow-hidden border-b border-white/[0.06]">
        <BannerArt focus="home" />
        <div className="relative mx-auto flex min-h-[min(82vh,760px)] max-w-6xl flex-col justify-end px-5 pb-12 pt-14 sm:px-6">
          <p className="kicker">
            Chain {CHAIN.id} · {PRODUCT.toolCount} operations · auth none · v{PRODUCT.version}
          </p>
          <h1 className="mt-4 max-w-3xl font-display text-5xl leading-[0.94] text-ivory sm:text-7xl">
            Intel for agents on Robinhood Chain.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-ivory/80">
            Search. Chart. Desk. Launch. Track. Add the live MCP, open Orbit, or sign a pons launch in Phantom — keys
            never leave your wallet.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
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
            <InstallApp />
          </div>
          <p className="mt-6 font-mono text-xs text-ember">{CANONICAL_MCP}</p>
          <dl className="mt-10 grid gap-3 sm:grid-cols-4">
            {[
              ["Network", `${CHAIN.name} ${CHAIN.id}`],
              ["Slug", CHAIN.slug],
              ["Catalog", `${PRODUCT.toolCount} ops`],
              ["Wallet", "Phantom · EIP-1193"],
            ].map(([k, v]) => (
              <div key={k} className="glass-2 px-4 py-3">
                <dt className="text-[10px] uppercase tracking-[0.2em] text-ivory/70">{k}</dt>
                <dd className="mt-1 text-sm text-ivory">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <PageFrame>
        <FirstVisit />
        <div className="grid gap-3 sm:grid-cols-5">
          {PRODUCT.pillars.map((p, i) => (
            <Link key={p.name} href={p.href} className="panel px-4 py-5">
              <p className="font-mono text-[10px] text-ivory/55">0{i + 1}</p>
              <p className="mt-2 font-display text-xl text-ivory">{p.name}</p>
              <p className="mt-1 text-xs leading-relaxed text-ivory/75">{p.blurb}</p>
            </Link>
          ))}
        </div>
        <section className="glass-2 p-6 sm:p-8">
          <p className="kicker">What is Apogee?</p>
          <h2 className="mt-2 font-heading text-3xl text-ivory">{ABOUT[0].title}</h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-ivory/80">{ABOUT[0].body}</p>
          <div className="mt-5 flex flex-wrap gap-3">
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
