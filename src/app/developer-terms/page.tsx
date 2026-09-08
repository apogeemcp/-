import { LegalDoc } from "@/components/LegalDoc";
import { CANONICAL_MCP, COMMUNITY, LEGAL, PRODUCT } from "@/lib/site";
import { GITHUB_REPO, RATE_LIMIT } from "@/lib/docs";
import { CHAIN } from "@/lib/chain";

export const metadata = {
  title: "Developer terms",
  description: "Developer Terms, MCP usage rules, and API limitations for Apogee MCP.",
};

export default function DeveloperTermsPage() {
  return (
    <LegalDoc
      title="Developer Terms"
      body={[
        LEGAL.counsel,
        `These Developer Terms sit alongside the site Terms of Use. They apply when you call ${CANONICAL_MCP}, REST /api/v1, or build a product on Apogee (${PRODUCT.name} ${PRODUCT.version}).`,
        `MCP usage rules. Protocol 2025-03-26, Streamable HTTP JSON-RPC POST. Authentication is currently none. Rate limit ${RATE_LIMIT.limit} requests per ${RATE_LIMIT.windowLabel} per client IP per process. Do not scrape beyond reasonable automated use. Do not instruct agents to collect seed phrases.`,
        `API/MCP limitations. Tool results can be delayed, incomplete, or wrong. Catalog aliases are not a promise of unique on-chain entities. get_swap_quote is indicative. prepare_pons_launch returns an unsigned transaction; you sign it. Apogee does not broadcast unless you sign.`,
        `Data usage. Third-party feeds (DexScreener, GeckoTerminal, DefiLlama, RHJ, RPC, Blockscout) remain under their licenses. MCP access does not grant permission to redistribute that data outside those licenses. See /data-usage.`,
        `Supported chains. ${CHAIN.name} only (EIP-155 ${CHAIN.id}, DexScreener/Gecko slug ${CHAIN.slug}). No other chain is implemented.`,
        `Paid access. Official USD list prices and a 25% $ORBITX buy-and-burn allocation are published for a future access product. Checkout, grants, and burns are not live. Do not pay third parties selling Apogee MCP keys — this software does not issue them.`,
        `Wallet authentication. Connecting Phantom (Ethereum / EIP-1193) and signing a nonce proves wallet ownership for hub features. A typed address is not proof. Solana Phantom login is not a verified identity in this repository.`,
        `Risk. Market data is not investment advice. ${LEGAL.stock} ${LEGAL.pons} ${LEGAL.disclaimer}`,
        `Contact. ${COMMUNITY.telegram} · ${COMMUNITY.x} · ${GITHUB_REPO}. No published support SLA.`,
      ]}
    />
  );
}
