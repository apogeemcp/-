import Image from "next/image";
import { LaunchPad } from "@/components/LaunchPad";
import { SaturnBackdrop } from "@/components/SaturnBackdrop";

export default function LaunchesPage() {
  return (
    <main className="relative min-h-screen">
      <SaturnBackdrop className="pointer-events-none fixed inset-0 opacity-40" />
      <div className="relative z-10 mx-auto max-w-6xl space-y-8 px-5 pb-24 pt-28">
        <header className="overflow-hidden rounded-3xl border border-gold/20">
          <div className="relative h-44 sm:h-56">
            <Image src="/brand/banner.png" alt="Apogee" fill className="object-cover" priority />
            <div className="absolute inset-0 bg-gradient-to-r from-void via-void/70 to-transparent" />
            <div className="absolute inset-0 flex flex-col justify-end p-6 sm:p-8">
              <p className="text-[11px] uppercase tracking-[0.4em] text-gold">pons · on-chain · chain 4663</p>
              <h1 className="mt-2 font-display text-4xl text-ivory sm:text-6xl">Launches</h1>
              <p className="mt-2 max-w-xl text-sm text-ivory/70">
                Indexed from factory <span className="text-gold">TokenLaunched</span> logs. v2 bonding curves graduate
                into locked Uniswap v4 pools. v1 tokens already trade in their WETH pool.
              </p>
            </div>
          </div>
        </header>
        <section className="glass rounded-3xl p-6">
          <LaunchPad />
        </section>
        <p className="text-xs leading-relaxed text-ivory/45">
          Data is read from Robinhood Chain contracts published at{" "}
          <a className="text-gold" href="https://docs.ponsfamily.com/#network">
            docs.ponsfamily.com
          </a>
          . Write pons lowercase and link the{" "}
          <a className="text-gold" href="https://www.ponsfamily.com/launchpad">
            pons app
          </a>
          . Apogee does not operate pons and does not endorse any launch. Graduation is not a quality signal.
        </p>
      </div>
    </main>
  );
}
