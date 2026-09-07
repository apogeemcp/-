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
        <header>
          <p className="text-[11px] uppercase tracking-[0.4em] text-ember">3D desk · zero auth</p>
          <h1 className="mt-2 font-display text-4xl text-ivory sm:text-6xl">Mission control</h1>
          <p className="mt-3 max-w-2xl text-ivory/70">
            Configure Apogee once. Every connected agent inherits the same Robinhood Chain tools: token search, OG-style
            scans, candles, stock-token quotes, launches, and a live desk.
          </p>
        </header>
        <ConnectPanel />
        <ScanBox />
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
