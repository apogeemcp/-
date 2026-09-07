import Image from "next/image";
import { Suspense } from "react";
import { ConnectPanel } from "@/components/ConnectPanel";
import { DeskLive } from "@/components/DeskLive";
import { ScanBox } from "@/components/ScanBox";
import { SaturnBackdrop } from "@/components/SaturnBackdrop";
import { TOOLS } from "@/lib/tools";

export default function DashboardPage() {
  return (
    <main className="relative min-h-screen">
      <SaturnBackdrop className="pointer-events-none fixed inset-0 opacity-50" />
      <div className="relative z-10 mx-auto max-w-6xl space-y-8 px-5 pb-24 pt-28">
        <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.4em] text-ember">3D desk · zero auth · pons-indexed</p>
            <h1 className="mt-2 font-display text-4xl text-ivory sm:text-6xl">Mission control</h1>
            <p className="mt-3 max-w-2xl text-ivory/70">
              Configure Apogee once. Every connected agent inherits Robinhood Chain tools: token search, OG-style
              scans, candles, stock-token quotes, and live pons v1/v2 launches.
            </p>
          </div>
          <Image
            src="/brand/logo.png"
            alt="Apogee"
            width={280}
            height={158}
            className="hidden w-56 rounded-2xl ring-1 ring-gold/20 sm:block"
          />
        </header>
        <ConnectPanel />
        <Suspense fallback={<p className="text-ivory/50">Loading scan…</p>}>
          <ScanBox />
        </Suspense>
        <DeskLive />
        <section className="glass rounded-3xl p-6">
          <p className="text-[10px] uppercase tracking-[0.24em] text-gold">{TOOLS.length} MCP tools</p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {TOOLS.map((t) => (
              <div key={t.name} className="rounded-xl border border-white/5 px-3 py-3">
                <p className="font-mono text-xs text-gold">{t.name}</p>
                <p className="mt-1 text-[11px] leading-relaxed text-ivory/55">{t.description}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
