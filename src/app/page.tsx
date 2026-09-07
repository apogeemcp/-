import Link from "next/link";
import { SaturnBackdrop } from "@/components/SaturnBackdrop";

export default function HomePage() {
  return (
    <main className="relative min-h-screen overflow-hidden">
      <SaturnBackdrop className="absolute inset-0" />
      <div className="relative z-10 mx-auto flex min-h-screen max-w-6xl flex-col justify-end px-5 pb-24 pt-28">
        <p className="text-[11px] uppercase tracking-[0.42em] text-gold">Saturn black · gold · ember · flare</p>
        <h1 className="apogee-title mt-4 font-display text-5xl leading-none text-ivory sm:text-7xl md:text-8xl">
          APOGEE
        </h1>
        <p className="mt-5 max-w-xl text-lg text-ivory/75">
          Robinhood Chain intel for agents. Search. Chart. Desk. Launch. No login — add the MCP to Cursor, Claude,
          ChatGPT, or any AI app and start scanning the chain.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/dashboard"
            className="rounded-full bg-gradient-to-r from-gold via-ember to-flare px-6 py-3 text-sm font-medium uppercase tracking-[0.18em] text-void shadow-ember"
          >
            Open the desk
          </Link>
          <Link
            href="/docs"
            className="rounded-full border border-gold/40 px-6 py-3 text-sm uppercase tracking-[0.18em] text-ivory"
          >
            20 tools
          </Link>
        </div>
        <div className="mt-14 grid gap-3 sm:grid-cols-4">
          {["Search", "Chart", "Desk", "Launch"].map((p) => (
            <div key={p} className="glass rounded-2xl px-4 py-5">
              <p className="font-display text-xl text-gold">{p}</p>
              <p className="mt-1 text-xs text-ivory/55">OrbitX-class surface, rebuilt for chain 4663.</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
