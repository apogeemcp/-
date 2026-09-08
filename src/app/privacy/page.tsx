import { LegalDoc } from "@/components/LegalDoc";
import { LEGAL, PRODUCT, mcpHttpUrl, COMMUNITY } from "@/lib/site";
import { GITHUB_REPO } from "@/lib/docs";

export default function PrivacyPage() {
  return (
    <LegalDoc
      title="Privacy & data handling"
      body={[
        LEGAL.counsel,
        `Apogee is a public, no-login Model Context Protocol server and website for Robinhood Chain. Canonical MCP: ${mcpHttpUrl()}. Catalog size ${PRODUCT.toolCount}.`,
        "What we collect. We do not create user accounts, profiles, or privacy toggles. Wallet addresses you paste are queried on-chain in your session. We do not publish a social profile of your trades.",
        "What we store. Tool calls may write tool name, a truncated query string (ticker or public address), ok flag, and timestamp to Supabase table apogee_usage (service-role writes, RLS with no public policies). Scan logs may exist as anonymous telemetry. If the usage summary SQL is not applied on hosted Supabase, the Usage page shows an honest error instead of fake stats.",
        "What is publicly visible. Token pages, desk, launches, and MCP results are public-data views. Anyone can query the same contracts.",
        "Wallet data. Read-only RPC balances and optional explorer transfers. Keys never leave Phantom / your EIP-1193 wallet.",
        "Account data. None. There is no signup.",
        "AI conversations. Orbit prompts are processed in the request. If NVIDIA NIM is configured, the prompt and tool traces are sent to NVIDIA’s API under their terms. We do not claim those prompts are stored by Apogee as a chat archive.",
        "Tool usage. See apogee_usage above. Hosting providers (e.g. Vercel) retain ordinary access logs (IP, user agent, URL, status).",
        "Analytics. There is no separate marketing pixel documented in this repo. Usage telemetry is operational.",
        "Cookies. The marketing site does not require cookies for MCP to work. A PWA service worker may cache static assets on devices that install the app.",
        "IP / network data. Standard HTTPS logs via the host. Rate limiting uses client IP (x-forwarded-for / x-real-ip) in process memory.",
        "Retention. Usage rows persist until operators delete them. In-memory rate-limit buckets expire after the 60-second window. In-memory data caches expire at their TTLs (e.g. 20s launches, 10m RHJ assets).",
        "Deletion. There is no self-serve account deletion because there is no account. Operators can truncate telemetry tables.",
        "Third-party providers. Public RPC, DexScreener, GeckoTerminal, DefiLlama, RHJ, Blockscout, optional NVIDIA NIM, Supabase. Their privacy terms apply when we call them with public queries.",
        LEGAL.data,
        `Contact: GitHub ${GITHUB_REPO}. Community ${COMMUNITY.telegram} / ${COMMUNITY.x}. Do not send seed phrases.`,
        LEGAL.disclaimer,
      ]}
    />
  );
}
