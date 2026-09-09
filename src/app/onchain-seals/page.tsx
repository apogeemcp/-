import { PageFrame, PageHero } from "@/components/PageHero";
import { OnchainSealComposer } from "@/components/OnchainSealComposer";
import { SERVICE_WALLET_PUBLIC } from "@/lib/onchain-config";

export const metadata = {
  title: "Token seals",
  description: "Pick $ORBITX or $ROKHA, write a memo, mint an image on-chain, and burn up to $0.25 of that token.",
};

export default function OnchainSealsPage() {
  return (
    <main>
      <PageHero
        kicker="Token seals"
        title="Memo + image, then buy and burn"
        focus="desk"
        lede="Click $ORBITX or $ROKHA. Write a public memo and attach an image. The Apogee service wallet stores the image forever (Irys/Arweave), mints a 1/1 on Solana, then buys and burns up to $0.25 of the token you picked."
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
