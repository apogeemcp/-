import { LaunchPad } from "@/components/LaunchPad";
import { PageFrame, PageHero } from "@/components/PageHero";
import { LEGAL } from "@/lib/site";

export default function LaunchesPage() {
  return (
    <main>
      <PageHero
        kicker="pons · factory logs · 4663"
        title="Launches"
        lede="Indexed from TokenLaunched events. v2 bonding curves graduate into locked Uniswap v4. v1 already trades vs WETH. Graduation is not quality."
      />
      <PageFrame>
        <section className="panel rounded-xl p-6">
          <LaunchPad />
        </section>
        <p className="text-xs leading-relaxed text-ivory/70">{LEGAL.pons}</p>
      </PageFrame>
    </main>
  );
}
