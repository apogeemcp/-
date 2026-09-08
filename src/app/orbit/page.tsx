import { OrbitChat } from "@/components/OrbitChat";
import { SaturnBackdrop } from "@/components/SaturnBackdrop";

export default function OrbitPage() {
  return (
    <main className="relative min-h-screen">
      <SaturnBackdrop className="pointer-events-none fixed inset-0 opacity-45" />
      <div className="relative z-10 mx-auto max-w-4xl space-y-6 px-5 pb-24 pt-28">
        <header>
          <p className="text-[11px] uppercase tracking-[0.4em] text-gold">Chat · Phantom · pons</p>
          <h1 className="mt-2 font-display text-4xl text-ivory sm:text-6xl">Orbit</h1>
          <p className="mt-3 max-w-2xl text-sm text-ivory/70">
            Talk to Apogee on Robinhood Chain. Scan, track wallets, and prepare pons launches. Connect Phantom (Ethereum
            mode) to sign. Keys never leave your wallet.
          </p>
        </header>
        <OrbitChat />
      </div>
    </main>
  );
}
