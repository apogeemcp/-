import { LegalDoc } from "@/components/LegalDoc";
import { LEGAL, mcpHttpUrl } from "@/lib/site";

export default function TermsPage() {
  return (
    <LegalDoc
      title="Terms of Use"
      body={[
        `Apogee is provided as-is for developers and AI agents querying public Robinhood Chain data via ${mcpHttpUrl()}. It is not a broker, exchange, custodian, or investment adviser.`,
        LEGAL.affiliation,
        LEGAL.pons,
        LEGAL.stock,
        "Most MCP tools are read-only. get_swap_quote is indicative only. prepare_pons_launch and similar helpers return unsigned transactions for you to review and sign in your own wallet. Do not treat a prepared payload as a confirmed on-chain launch.",
        LEGAL.data,
        LEGAL.keys,
        "You will not use Apogee to attack infrastructure, scrape beyond reasonable rates, launder funds, or violate sanctions or securities law. We may rate-limit or block abusive clients.",
        "THE SOFTWARE AND DATA ARE PROVIDED “AS IS” WITHOUT WARRANTY OF ANY KIND. TO THE MAXIMUM EXTENT PERMITTED BY LAW, APOGEE AND ITS AUTHORS ARE NOT LIABLE FOR TRADING LOSSES, DATA ERRORS, FAILED TRANSACTIONS, OR INCIDENTAL DAMAGES.",
        "By calling the MCP or using the site, you accept these terms.",
      ]}
    />
  );
}
