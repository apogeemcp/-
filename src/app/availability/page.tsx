import { LegalDoc } from "@/components/LegalDoc";
import { LEGAL } from "@/lib/site";
import { CHAIN } from "@/lib/chain";

export default function AvailabilityPage() {
  return (
    <LegalDoc
      title="Availability"
      body={[
        LEGAL.counsel,
        `Technical availability. Apogee currently indexes ${CHAIN.name} (EIP-155 ${CHAIN.id}) via public RPC and market providers. The website and MCP may be down when hosting, RPC, or a provider fails. Check /developers/status for live probes — not a contractual uptime guarantee.`,
        "Geographic restrictions. This repository does not implement an IP geo-fence for the MCP server. That does not mean the service is lawful or appropriate everywhere.",
        LEGAL.stock,
        "Availability can change based on applicable law, provider terms, infrastructure, and service policy. Do not assume legal availability in every country because a public URL loads.",
        "MCP is a protocol. Legal and regulatory obligations associated with a product using MCP depend on the functionality offered, the data processed, the jurisdictions involved, and how the service is operated.",
        "Distinguish: (1) Protocol — MCP. (2) Apogee software — this implementation. (3) Data — chain and third-party. (4) Financial functionality — unsigned launch helpers and indicative quotes; no custody. (5) User-generated content — not a social network with posts in this repo. (6) AI — Orbit / host models.",
        "Legal review checklist (for operators and integrators — not advice): privacy laws; consumer protection; financial-services rules if you add execution or custody; securities/commodities questions for tokenised stocks; money transmission if you ever move value; sanctions/export; AML/KYC if you onboard customers; IP and data licensing; third-party terms; regional restrictions including Stock Token geographies.",
        "Do not claim a feature is legally unrestricted because it is exposed through MCP.",
        LEGAL.disclaimer,
      ]}
    />
  );
}
