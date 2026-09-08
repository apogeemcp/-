import { CopyButton } from "@/components/TokenMedia";
import { PageFrame, PageHero } from "@/components/PageHero";
import { COMMUNITY, PROJECT_CA, CANONICAL_MCP } from "@/lib/site";

export default function LinksPage() {
  return (
    <main>
      <PageHero
        compact
        focus="launch"
        kicker="Community"
        title="Links"
        lede="Official channels and the project contract. Copy CA confirms in-place. No other socials are claimed here."
      />
      <PageFrame>
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            ["Telegram", COMMUNITY.telegram],
            ["X", COMMUNITY.x],
            ["Website", COMMUNITY.website],
            ["MCP", CANONICAL_MCP],
          ].map(([label, href]) => (
            <a key={label} href={href} target={href.startsWith("http") ? "_blank" : undefined} rel="noreferrer" className="glass-2 p-6 hover:border-ember/50">
              <p className="kicker">{label}</p>
              <p className="mt-3 break-all font-mono text-sm text-ivory">{href.replace("https://", "")}</p>
            </a>
          ))}
        </div>
        <section className="glass-3 p-6">
          <p className="kicker">Contract address</p>
          <p className="mt-3 font-mono text-sm text-ivory/90">
            {PROJECT_CA.slice(0, 8)}…{PROJECT_CA.slice(-6)}
          </p>
          <p className="mt-2 break-all font-mono text-[11px] text-ivory/70">{PROJECT_CA}</p>
          <div className="mt-4">
            <CopyButton value={PROJECT_CA} label="Copy CA" />
          </div>
        </section>
      </PageFrame>
    </main>
  );
}
