import { OrbitChat } from "@/components/OrbitChat";
import { PageFrame, PageHero } from "@/components/PageHero";
import { LEGAL } from "@/lib/site";

export default function OrbitPage() {
  return (
    <main>
      <PageHero
        compact
        kicker="Chat · Phantom · pons"
        title="Orbit"
        lede="Scan, track a wallet, or ask to launch a token. Unsigned pons v2 transactions are signed in Phantom on chain 4663."
      />
      <PageFrame>
        <OrbitChat />
        <p className="text-xs leading-relaxed text-ivory/40">{LEGAL.keys}</p>
      </PageFrame>
    </main>
  );
}
