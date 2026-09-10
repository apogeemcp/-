import { PageFrame, PageHero } from "@/components/PageHero";
import { OnchainSealComposer } from "@/components/OnchainSealComposer";
import { SEAL_EDITION_CAP, SERVICE_WALLET_PUBLIC } from "@/lib/onchain-config";

export const metadata = {
  title: "Token seals",
  description: `Limited edition of ${SEAL_EDITION_CAP} Saturn cards. Pick $ORBITX or $ROKHA, write a memo, mint an image on-chain, and burn up to $0.25 of that token.`,
};

export default function OnchainSealsPage() {
  return (
    <main>
      <PageHero
        kicker="Token seals · 50 cards"
        title="Saturn edition, then closed"
        focus="desk"
        lede={`Only ${SEAL_EDITION_CAP} seals will ever exist. Each one is a numbered Saturn card: your memo, the permanent image, the 1/1, and the buy/burn. After card 50 the set is locked.`}
      />
      <PageFrame>
        <p className="mb-6 text-sm text-ivory/70">
          Funded by the service wallet{" "}
          <a className="font-mono text-ember" href={`https://solscan.io/account/${SERVICE_WALLET_PUBLIC}#transactions`} target="_blank" rel="noreferrer">
            {SERVICE_WALLET_PUBLIC}
          </a>
          . Seals are public and irreversible. Do not put secrets in the memo or the image.
        </p>
        <OnchainSealComposer />
      </PageFrame>
    </main>
  );
}
