export default function TermsPage() {
  return (
    <main className="mx-auto max-w-3xl px-5 pb-24 pt-28">
      <p className="text-[11px] uppercase tracking-[0.3em] text-gold">Legal</p>
      <h1 className="mt-2 font-display text-4xl">Terms of Use</h1>
      <p className="mt-2 text-sm text-ivory/50">Last updated September 7, 2026</p>
      <div className="mt-8 space-y-4 text-sm leading-relaxed text-ivory/75">
        <p>
          Apogee is provided as-is for developers and AI agents querying public Robinhood Chain data. It is not a
          broker, exchange, wallet, or investment adviser.
        </p>
        <p>
          Apogee is unaffiliated with Robinhood Markets, Inc., Robinhood Crypto, Robinhood Assets (Jersey) Ltd, or
          any Robinhood product. “Robinhood Chain” is referenced only as the public network Apogee indexes.
        </p>
        <p>
          Launch indexing reads public pons contracts. Write pons in lowercase and link{" "}
          <a className="text-gold" href="https://www.ponsfamily.com/launchpad">
            https://www.ponsfamily.com/launchpad
          </a>
          . Apogee does not operate pons, is not a partner, and does not endorse any token. Graduation only means a
          threshold was reached.
        </p>
        <p>
          Stock Tokens are tokenised debt securities. They may not be offered, sold, or delivered to persons in the
          United States, Canada, the United Kingdom, or Switzerland. Do not use Apogee to solicit or execute such
          offers.
        </p>
        <p>
          All MCP tools are read-only. Quotes are not executable orders. Market data can be delayed, incomplete, or
          wrong. Ticker symbols collide — always verify the contract address.
        </p>
        <p>
          You will not use Apogee to attack infrastructure, scrape beyond reasonable rates, launder funds, or violate
          sanctions or securities law. We may rate-limit or block abusive clients.
        </p>
        <p>
          THE SOFTWARE AND DATA ARE PROVIDED “AS IS” WITHOUT WARRANTY OF ANY KIND. TO THE MAXIMUM EXTENT PERMITTED BY
          LAW, APOGEE AND ITS AUTHORS ARE NOT LIABLE FOR TRADING LOSSES, DATA ERRORS, OR INCIDENTAL DAMAGES.
        </p>
        <p>By calling the MCP or using the site, you accept these terms.</p>
      </div>
    </main>
  );
}
