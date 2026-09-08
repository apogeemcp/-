import { LegalDoc } from "@/components/LegalDoc";
import { LEGAL, PRODUCT, mcpHttpUrl } from "@/lib/site";

export default function PrivacyPage() {
  return (
    <LegalDoc
      title="Privacy Policy"
      body={[
        `Apogee is a public, no-login Model Context Protocol server and website for Robinhood Chain. Canonical MCP: ${mcpHttpUrl()}. Catalog size ${PRODUCT.toolCount}.`,
        "We do not create user accounts. We do not ask for names, emails, passwords, seed phrases, or private keys. Phantom (or another EIP-1193 wallet) signs in your browser; Apogee never receives the key material.",
        "When you or an AI client call tools, we may log the tool name, query string (ticker or public address), timestamp, and coarse result metadata so the APIs stay reliable. Hosting providers retain ordinary access logs.",
        LEGAL.data,
        "If scan history is stored in Supabase, it is anonymous telemetry and caching — not advertising profiles.",
        "The marketing site does not require cookies for the MCP to work.",
        "Contact: open an issue on the Apogee GitHub repository.",
      ]}
    />
  );
}
