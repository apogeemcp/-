import { GuidePanel } from "@/components/InfoBits";
import { PageFrame, PageHero } from "@/components/PageHero";
import { GUIDES } from "@/lib/copy";
import Link from "next/link";

const LINKS: Record<keyof typeof GUIDES, string> = {
  desk: "/dashboard",
  launch: "/launches",
  orbit: "/orbit",
  mcp: "/connect",
  profile: "/wallet",
  token: "/dashboard",
  onchain: "/onchain-notes",
};

export default function GuidesPage() {
  return (
    <main>
      <PageHero
        compact
        focus="desk"
        kicker="Learn"
        title="Guides"
        lede="Short, factual walkthroughs. Open a surface, then come back here if a term is new."
      />
      <PageFrame>
        <div className="grid gap-4 sm:grid-cols-2">
          {(Object.keys(GUIDES) as Array<keyof typeof GUIDES>).map((id) => (
            <div key={id}>
              <GuidePanel title={GUIDES[id].title} body={GUIDES[id].body} href={LINKS[id]} />
              <Link href={LINKS[id]} className="mt-2 inline-block text-xs uppercase tracking-[0.16em] text-ember">
                Open {id} →
              </Link>
            </div>
          ))}
        </div>
      </PageFrame>
    </main>
  );
}
