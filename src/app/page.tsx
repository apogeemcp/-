import Image from "next/image";
import Link from "next/link";
import { SaturnBackdrop } from "@/components/SaturnBackdrop";

export default function HomePage() {
  return (
    <main className="relative min-h-screen overflow-hidden">
      <SaturnBackdrop className="absolute inset-0 opacity-80" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[62vh]">
        <Image src="/brand/banner.png?v=3" alt="" fill className="object-cover object-[center_20%]" priority />
        <div className="absolute inset-0 bg-gradient-to-b from-void/10 via-void/35 to-void" />
      </div>
      <div className="relative z-10 mx-auto flex min-h-screen max-w-6xl flex-col justify-end px-5 pb-24 pt-28">
        <Image
          src="/brand/logo.png?v=3"
          alt="Apogee"
          width={920}
          height={518}
          className="w-full max-w-xl drop-shadow-[0_20px_80px_rgba(255,107,26,0.25)]"
          priority
        />
        <h1 className="sr-only">Apogee — Robinhood Chain MCP</h1>
        <p className="mt-5 max-w-xl text-lg text-ivory/75">
          Robinhood Chain intel for agents. Search. Chart. Desk. Launch. Live on-chain indexing of{" "}
          <span className="text-gold">pons</span> v1 and v2. No login — add the MCP to Cursor, Claude, ChatGPT, or any
          AI app and start scanning the chain.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/dashboard"
            className="rounded-full bg-gradient-to-r from-gold via-ember to-flare px-6 py-3 text-sm font-medium uppercase tracking-[0.18em] text-void shadow-ember"
          >
            Open the desk
          </Link>
          <Link
            href="/launches"
            className="rounded-full border border-gold/40 px-6 py-3 text-sm uppercase tracking-[0.18em] text-ivory"
          >
            pons launches
          </Link>
          <Link href="/docs" className="rounded-full border border-ivory/20 px-6 py-3 text-sm uppercase tracking-[0.18em] text-ivory/80">
            Tools
          </Link>
        </div>
        <div className="mt-14 grid gap-3 sm:grid-cols-4">
          {[
            ["Search", "Tickers, contracts, Stock Tokens."],
            ["Chart", "Live RH chain candles."],
            ["Desk", "Trending + oracle vs DEX."],
            ["Launch", "pons v2 curves & v1 pools."],
          ].map(([p, d]) => (
            <div key={p} className="glass rounded-2xl px-4 py-5">
              <p className="font-display text-xl text-gold">{p}</p>
              <p className="mt-1 text-xs text-ivory/55">{d}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
