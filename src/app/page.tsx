import Link from "next/link";
import { BannerArt, PageFrame } from "@/components/PageHero";
import { CANONICAL_MCP, LEGAL, PRODUCT } from "@/lib/site";
import { CHAIN } from "@/lib/chain";

export default function HomePage() {
  return (
    <main>
      <section className="relative isolate min-h-[min(88vh,840px)] overflow-hidden border-b border-white/[0.06]">
        <BannerArt focus="home" />
        <div className="relative mx-auto flex min-h-[min(88vh,840px)] max-w-6xl flex-col justify-end px-5 pb-14 pt-16 sm:px-6">
          <p className="kicker">
            Chain {CHAIN.id} · {PRODUCT.toolCount} operations · auth none · v{PRODUCT.version}
          </p>
          <h1 className="mt-4 max-w-3xl font-display text-5xl leading-[0.94] text-ivory sm:text-7xl">
            Intel for agents on Robinhood Chain.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-ivory/70">
            {PRODUCT.pillars.map((p) => p.name).join(". ")}. Add the live MCP to Cursor, Claude, ChatGPT, or Grok.
            Connect Phantom to sign a pons launch — keys never leave your wallet.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/connect" className="btn-gold">
              Add MCP
            </Link>
            <Link href="/orbit" className="btn-ghost">
              Open Orbit
            </Link>
            <Link href="/launches" className="btn-ghost">
              pons launches
            </Link>
          </div>
          <p className="mt-6 font-mono text-xs text-gold/90">{CANONICAL_MCP}</p>
          <dl className="mt-10 grid gap-3 sm:grid-cols-4">
            {[
              ["Network", `${CHAIN.name} ${CHAIN.id}`],
              ["Slug", CHAIN.slug],
              ["Catalog", `${PRODUCT.toolCount} ops`],
              ["Wallet", "Phantom · EIP-1193"],
            ].map(([k, v]) => (
              <div key={k} className="rounded-xl border border-white/10 bg-black/35 px-4 py-3">
                <dt className="text-[10px] uppercase tracking-[0.2em] text-ivory/40">{k}</dt>
                <dd className="mt-1 text-sm text-ivory">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <PageFrame>
        <div className="grid gap-3 sm:grid-cols-5">
          {PRODUCT.pillars.map((p, i) => (
            <Link key={p.name} href={p.href} className="panel rounded-xl px-4 py-5 hover:border-gold/35">
              <p className="font-mono text-[10px] text-ivory/35">0{i + 1}</p>
              <p className="mt-2 font-display text-xl text-ivory">{p.name}</p>
              <p className="mt-1 text-xs leading-relaxed text-ivory/50">{p.blurb}</p>
            </Link>
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            ["01 · Connect", "Paste the MCP URL with auth none, or use the Cursor deeplink.", "/connect"],
            ["02 · Desk", "Scan a ticker, read the live desk, and open a pons launch.", "/dashboard"],
            ["03 · Sign", "Orbit prepares an unsigned v2 tx. Phantom signs it on 4663.", "/orbit"],
          ].map(([t, d, href]) => (
            <Link key={t} href={href} className="panel rounded-xl p-5 hover:border-gold/35">
              <p className="kicker">{t}</p>
              <p className="mt-3 text-sm leading-relaxed text-ivory/65">{d}</p>
            </Link>
          ))}
        </div>
        <p className="text-xs leading-relaxed text-ivory/40">
          {LEGAL.affiliation} {LEGAL.stock} {LEGAL.pons}
        </p>
      </PageFrame>
    </main>
  );
}
