import { PageFrame, PageHero } from "@/components/PageHero";
import { LEGAL } from "@/lib/site";

export function LegalDoc({ title, body }: { title: string; body: string[] }) {
  return (
    <main>
      <PageHero compact kicker="Legal" title={title} lede={`Last updated ${LEGAL.updated}. ${LEGAL.affiliation}`} />
      <PageFrame>
        <div className="panel space-y-4 rounded-xl p-6 text-sm leading-relaxed text-ivory/75 sm:p-8">
          {body.map((p, i) => (
            <p key={`${i}-${p.slice(0, 24)}`}>{p}</p>
          ))}
        </div>
      </PageFrame>
    </main>
  );
}
