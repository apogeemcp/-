import { LegalDoc } from "@/components/LegalDoc";
import { LEGAL, mcpHttpUrl, COMMUNITY, PRODUCT } from "@/lib/site";
import { GITHUB_REPO, RATE_LIMIT } from "@/lib/docs";

export default function TermsPage() {
  const mcp = mcpHttpUrl();
  return (
    <LegalDoc
      title="Terms of Use"
      body={[
        LEGAL.counsel,
        `Acceptance. By using ${COMMUNITY.website}, ${mcp}, /api/v1, or related Apogee software, you agree to these terms. If you do not agree, do not use the services.`,
        `Platform description. Apogee (${PRODUCT.name} ${PRODUCT.version}) is software that reads public Robinhood Chain data and exposes it through a website, REST, and a Model Context Protocol server. It is not a broker, exchange, custodian, wallet operator, or investment adviser.`,
        `MCP services. The MCP server at ${mcp} (alias /mcp) uses Streamable HTTP JSON-RPC, protocol 2025-03-26, authentication none. MCP is a technical protocol. Obligations depend on functionality, data, jurisdictions, and how you operate a product that calls Apogee — not on MCP itself. Official USD list prices for future paid access are published at /developers/access. Checkout, grants, and $ORBITX burns are not enabled. Do not pay third parties claiming to sell Apogee MCP keys or burns; this software does not issue those credentials. See also /developer-terms.`,
        `Developer usage. You may call listed tools and catalog aliases for your own applications subject to these terms, rate limits, and third-party provider terms. You are responsible for how you present data to your users.`,
        `Acceptable use. You will not attack infrastructure, attempt to bypass rate limits, scrape beyond reasonable automated use, use Apogee to launder funds, violate sanctions, or violate securities or other applicable law. You will not instruct agents to obtain seed phrases or to broadcast transactions without an informed human signature.`,
        `Account responsibilities. Apogee does not sell user accounts. Connecting a wallet and signing a nonce can bind a developer profile to that address. You remain solely responsible for the wallet. A typed address is not proof of ownership.`,
        `API/MCP usage. Tool results can be wrong or incomplete. Unsigned launch helpers are not executed transactions. get_swap_quote is indicative only.`,
        `Rate limits. MCP POST, REST tool calls, and /api/agent are limited to ${RATE_LIMIT.limit} HTTP requests per ${RATE_LIMIT.windowLabel} per client IP per process. Hosting providers may apply additional limits. We may block abusive clients.`,
        `Intellectual property. Apogee software, marks, and original copy are owned by their authors. You do not acquire ownership of the protocol, third-party data, or blockchain state by calling MCP.`,
        `Third-party data. DexScreener, GeckoTerminal, DefiLlama, RHJ, Blockscout, RPC operators, NVIDIA (optional Orbit), and pons documentation are third parties. Their terms apply to their data and services. ${LEGAL.affiliation}`,
        `Blockchain data. Public chain data is not owned by Apogee. Reorgs, delayed indexers, and missing explorer APIs occur.`,
        `AI-generated content. Orbit and any model that consumes tool JSON can hallucinate. Treat AI text as opinion, not as a market fact, unless a tool result is shown.`,
        `Financial information disclaimer. Nothing is financial, legal, or investment advice. ${LEGAL.stock} ${LEGAL.pons}`,
        `No guarantee of accuracy. ${LEGAL.data}`,
        `Availability. Services may be interrupted. See /availability. We may change, suspend, or terminate access, including MCP methods, without liability to the extent permitted by law.`,
        `Suspension and termination. We may rate-limit or block clients that harm the service or appear to violate these terms.`,
        `Liability. THE SOFTWARE AND DATA ARE PROVIDED “AS IS” WITHOUT WARRANTY OF ANY KIND. TO THE MAXIMUM EXTENT PERMITTED BY LAW, APOGEE AND ITS AUTHORS ARE NOT LIABLE FOR TRADING LOSSES, DATA ERRORS, FAILED TRANSACTIONS, REGULATORY CONSEQUENCES OF YOUR PRODUCT, OR INCIDENTAL DAMAGES.`,
        `Indemnification. If you build a product on Apogee, you will defend and indemnify the authors against claims arising from your product, your users, or your unlawful use, to the extent permitted by law.`,
        `Governing law. These terms are a software license notice, not a negotiated contract selecting a courtroom. Have counsel map them to your jurisdiction before relying on them commercially.`,
        `Contact. Community: ${COMMUNITY.telegram} and ${COMMUNITY.x}. Source: ${GITHUB_REPO}. There is no published support SLA.`,
        LEGAL.keys,
        LEGAL.disclaimer,
      ]}
    />
  );
}
