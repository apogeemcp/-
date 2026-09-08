import { PageFrame, PageHero } from "@/components/PageHero";
import { ArchDiagram } from "@/components/ArchDiagram";
import { CHAIN } from "@/lib/chain";
import { CANONICAL_MCP, LEGAL, PRODUCT } from "@/lib/site";
import { DISCLAIMER, SUPPORTED_CHAINS, VERSIONING } from "@/lib/docs";
import Link from "next/link";

const SECTIONS: { title: string; body: string }[] = [
  {
    title: "1. Abstract",
    body: `Apogee is software that gives humans and AI agents structured access to public ${CHAIN.name} data. It combines a trading desk, launch indexer, wallet marks, Orbit assistant, and a Streamable HTTP MCP server (${CANONICAL_MCP}). It does not custody assets, operate pons, or affiliate with Robinhood Markets.`,
  },
  {
    title: "2. Problem",
    body: "AI applications cannot see a chain. Without tools, models guess prices, confuse tickers with Stock Tokens, and invent holder counts. Hosts need a callable, documented interface to live RPC and market providers — with honest empty states when an API is gated.",
  },
  {
    title: "3. Vision",
    body: "Apogee should be immediately useful in three ways: users get Robinhood Chain intelligence; agents get tools they can call; developers can integrate the same engine into their own apps. Future work stays grounded in this chain and these providers unless the code changes.",
  },
  {
    title: "4. Architecture",
    body: `Next.js 15 application. Dispatch in src/lib/dispatch.ts is shared by /api/mcp, /api/v1, and Orbit (/api/agent). Listed tools live in src/lib/tools.ts; ${PRODUCT.toolCount} catalog aliases in src/lib/catalog.ts. Phantom EIP-1193 is local. Optional NVIDIA NIM is server-side only.`,
  },
  {
    title: "5. MCP layer",
    body: `Protocol ${VERSIONING.mcpProtocol}, transport ${VERSIONING.transport}, auth ${VERSIONING.auth}. Methods: initialize, ping, tools/list, tools/call, resources/list, resources/read. The model only receives chain facts after a tool result. Alias /mcp rewrites to /api/mcp.`,
  },
  {
    title: "6. Data layer",
    body: "Public RPC, DexScreener (slug robinhood), GeckoTerminal, DefiLlama, RHJ Stock Token APIs, Blockscout when reachable, on-chain pons v1/v2 logs. Short in-memory TTLs: RHJ assets ~10m, ETH-USD ~60s, pons launch lists ~20s. No fabricated holder ledgers.",
  },
  {
    title: "7. Tool layer",
    body: `tools/list returns ${VERSIONING.listedTools} primary tools with JSON Schema inputs. search_catalog / run_tool invoke catalog aliases (scan_NVDA, volume_1h, …). Safety: almost all read-only; add_robinhood_chain is a wallet param helper; prepare_pons_launch / prepare_pons_buy are high-impact unsigned helpers.`,
  },
  {
    title: "8. AI layer",
    body: "Orbit maps natural language to the same tools. If NVIDIA_API_KEY (or NIM/NGC aliases) is set, NVIDIA NIM may choose tools (stream false, 20s timeout, up to a few rounds). Otherwise a heuristic agent still returns live tool JSON. AI text is opinion, not a feed.",
  },
  {
    title: "9. Developer ecosystem",
    body: "Documented at /developers. Cursor, VS Code, Claude, ChatGPT, Grok, Claude Code, Windsurf, and Codex CLI configs are generated from the live URL. REST mirrors tools. There is no private SDK package in this repository.",
  },
  {
    title: "10. Security",
    body: "Public MCP, wallet signatures for launches, input address checks, rate limits on MCP/REST/agent, RLS on usage tables, no seed phrases. Prompt injection is mitigated by tool allow-lists in your agent — not by MCP itself.",
  },
  {
    title: "11. Privacy",
    body: "No accounts. Optional anonymous usage rows. Hosting access logs. Optional NVIDIA processing of Orbit prompts. Details: /privacy.",
  },
  {
    title: "12. Scalability",
    body: "Stateless Next.js handlers plus per-process memory caches and rate-limit buckets. Catalog is generated in-process (3000 names). Upstream RPC/provider limits dominate. This paper does not publish unmeasured QPS claims.",
  },
  {
    title: "13. Supported chains",
    body: `Apogee currently supports ${SUPPORTED_CHAINS.map((c) => `${c.name} (id ${c.chainId}, slug ${c.slug}, native ${c.native})`).join("; ")}.`,
  },
  {
    title: "14. Future development",
    body: "Roadmap items are not promises. Honest gaps today include: explorer APIs often gated; no full holder census; no websocket firehose; no user accounts; no cost-basis PnL; NVIDIA optional; usage SQL must be applied on hosted Supabase; MCP protocol is 2025-03-26 until upgraded in code.",
  },
  {
    title: "15. Conclusion",
    body: "Apogee aims to remain a precise, developer-accessible intelligence layer for Robinhood Chain — useful to people, callable by agents, integrable by apps — without pretending to be a licensed venue or a multi-chain super-app.",
  },
];

export default function WhitepaperPage() {
  return (
    <main>
      <PageHero
        compact
        focus="orbit"
        kicker="Information"
        title="Technical whitepaper"
        lede={`${PRODUCT.name} ${PRODUCT.version}. Not a tokenomics document. No fabricated users, revenue, or partnerships.`}
        action={
          <>
            <Link href="/developers" className="btn-primary">
              Developers
            </Link>
            <Link href="/developers/mcp" className="btn-ghost">
              MCP
            </Link>
          </>
        }
      />
      <PageFrame>
        <ArchDiagram variant="mcp" />
        {SECTIONS.map((s) => (
          <section key={s.title} className="glass-2 p-6 sm:p-8">
            <h2 className="font-heading text-2xl text-ivory">{s.title}</h2>
            <p className="mt-3 text-sm leading-relaxed text-ivory/80 sm:text-base">{s.body}</p>
          </section>
        ))}
        <p className="text-xs text-ivory/55">{LEGAL.affiliation}</p>
        <p className="text-xs text-ivory/55">{LEGAL.counsel}</p>
        <p className="text-xs text-ivory/55">{DISCLAIMER}</p>
      </PageFrame>
    </main>
  );
}
