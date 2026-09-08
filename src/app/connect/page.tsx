import { ConnectPanel } from "@/components/ConnectPanel";
import { SaturnBackdrop } from "@/components/SaturnBackdrop";
import { CANONICAL_MCP } from "@/lib/site";
import { PRODUCT } from "@/lib/site";

export default function ConnectPage() {
  return (
    <main className="relative min-h-screen">
      <SaturnBackdrop className="pointer-events-none fixed inset-0 opacity-40" />
      <div className="relative z-10 mx-auto max-w-6xl space-y-8 px-5 pb-24 pt-28">
        <header>
          <p className="text-[11px] uppercase tracking-[0.4em] text-ember">Setup</p>
          <h1 className="mt-2 font-display text-4xl text-ivory sm:text-6xl">Connect Apogee</h1>
          <p className="mt-3 max-w-2xl text-ivory/70">
            Live MCP: <span className="font-mono text-gold">{CANONICAL_MCP}</span>. {PRODUCT.toolCount} Robinhood Chain
            operations. Auth none. One click into Cursor; paste the same URL into Claude, ChatGPT, or Grok connectors.
          </p>
        </header>
        <ConnectPanel />
      </div>
    </main>
  );
}
