import Link from "next/link";
import { CopyButton } from "@/components/TokenMedia";
import { TestConnection } from "@/components/TestConnection";
import { ArchDiagram } from "@/components/ArchDiagram";
import { CANONICAL_MCP, COMMUNITY, LEGAL, PRODUCT, PROJECT_CA } from "@/lib/site";
import { DISCLAIMER, GITHUB_REPO, VERSIONING } from "@/lib/docs";
import { CHAIN } from "@/lib/chain";

export default function DevelopersHome() {
  return (
    <div className="space-y-8">
      <header>
        <p className="kicker">Developers</p>
        <h1 className="mt-2 font-display text-4xl text-ivory sm:text-6xl">Build with Apogee</h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-ivory/80 sm:text-base">
          Access Apogee market intelligence, blockchain data, analytics and tools through MCP and integrate them into
          your own AI agents, applications and workflows.
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          <Link href="/developers/quickstart" className="btn-primary">
            Get started
          </Link>
          <Link href="/developers/mcp" className="btn-ghost">
            MCP documentation
          </Link>
          <Link href="/developers/tools" className="btn-ghost">
            View tools
          </Link>
          <Link href="/developers/access" className="btn-ghost">
            Access
          </Link>
          <Link href="/developers/partners" className="btn-ghost">
            Partners
          </Link>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <a href={GITHUB_REPO} className="btn-ghost" target="_blank" rel="noreferrer">
            GitHub
          </a>
          <a href={COMMUNITY.telegram} className="btn-ghost" target="_blank" rel="noreferrer">
            Telegram
          </a>
          <a href={COMMUNITY.x} className="btn-ghost" target="_blank" rel="noreferrer">
            X
          </a>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { t: "For users", d: "Apogee gives you Robinhood Chain market intelligence — desk, launches, wallets, Orbit." },
          { t: "For AI agents", d: "Apogee gives you tools you can call over MCP. The model only sees data after a tool result." },
          { t: "For developers", d: "You can integrate Apogee into your own application via Streamable HTTP or REST." },
        ].map((c) => (
          <div key={c.t} className="panel rounded-xl p-5">
            <p className="kicker">{c.t}</p>
            <p className="mt-2 text-sm text-ivory/80">{c.d}</p>
          </div>
        ))}
      </div>

      <section className="space-y-3">
        <h2 className="font-heading text-2xl text-ivory">What is Apogee?</h2>
        <p className="text-sm leading-relaxed text-ivory/80">
          Apogee is a platform that combines public blockchain data on {CHAIN.name} (chain id {CHAIN.id}), market
          intelligence, token analytics, wallet marks, launch indexing (pons, unaffiliated), trading-related quotes,
          an in-app assistant (Orbit), MCP tools, and developer HTTP integrations. It is not a broker, custodian,
          exchange, or investment adviser. It currently operates on one chain.
        </p>
        <p className="text-sm leading-relaxed text-ivory/80">
          Structured access is the live MCP at {CANONICAL_MCP} (auth none) and REST /api/v1. Catalog size{" "}
          {PRODUCT.toolCount}. Server {VERSIONING.serverName} {VERSIONING.product}, protocol {VERSIONING.mcpProtocol}.
          Other products can call the same tools without sending their users here. A $ORBITX burn-gated access model is
          documented as intent — it is not live and MCP is not sold from this site.
        </p>
      </section>

      <ArchDiagram variant="mcp" />
      <TestConnection />

      <section id="token" className="panel scroll-mt-28 rounded-xl p-5">
        <p className="kicker">Project contract</p>
        <p className="mt-2 break-all font-mono text-sm text-ivory">{PROJECT_CA}</p>
        <p className="mt-2 text-xs text-ivory/65">
          Copy the full address. Verify the chain before sending assets. This site does not invent an explorer link for
          this string because the chain is not labeled in the repository.
        </p>
        <div className="mt-3">
          <CopyButton value={PROJECT_CA} label="Copy address" />
        </div>
      </section>

      <p className="text-xs text-ivory/55">{LEGAL.affiliation}</p>
      <p className="text-xs text-ivory/55">{DISCLAIMER}</p>
    </div>
  );
}
