import { Accordion } from "@/components/InfoBits";
import { PageFrame, PageHero } from "@/components/PageHero";
import { FAQ } from "@/lib/copy";

export default function FaqPage() {
  return (
    <main>
      <PageHero
        compact
        focus="page"
        kicker="Help"
        title="FAQ"
        lede="Short answers from how the product actually works — chain 4663, live MCP, mark-to-market PnL, no accounts."
      />
      <PageFrame>
        {FAQ.map((g) => (
          <section key={g.id} className="space-y-3">
            <h2 className="font-heading text-2xl text-ivory">{g.title}</h2>
            <Accordion items={g.items} />
          </section>
        ))}
      </PageFrame>
    </main>
  );
}
