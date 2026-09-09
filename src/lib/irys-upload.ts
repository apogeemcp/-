import { Uploader } from "@irys/upload";
import { Solana } from "@irys/upload-solana";
import { solanaRpc } from "./onchain-config";
import { loadServiceKeypair } from "./orbitx-signer";

export type PermanentUpload = {
  id: string;
  url: string;
  arweaveUrl: string;
};

export async function uploadPermanentImage(bytes: Buffer, mime: string): Promise<PermanentUpload> {
  const payer = loadServiceKeypair();
  const irys = await Uploader(Solana)
    .withWallet(payer.secretKey)
    .withRpc(solanaRpc())
    .mainnet();
  const price = await irys.getPrice(bytes.length);
  const loaded = await irys.getLoadedBalance();
  if (loaded.lt(price)) {
    await irys.fund(price.multipliedBy(1.2));
  }
  const receipt = await irys.upload(bytes, {
    tags: [
      { name: "Content-Type", value: mime },
      { name: "App-Name", value: "Apogee" },
      { name: "Type", value: "token-seal-image" },
    ],
  });
  const id = String(receipt.id || "").trim();
  if (!id) throw new Error("Permanent image upload did not return an id.");
  return {
    id,
    url: `https://gateway.irys.xyz/${id}`,
    arweaveUrl: `https://arweave.net/${id}`,
  };
}
