import { Connection, Keypair, SystemProgram, Transaction, sendAndConfirmTransaction } from "@solana/web3.js";
import {
  TOKEN_2022_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  createInitializeMetadataPointerInstruction,
  createInitializeMintInstruction,
  createMintToInstruction,
  getAssociatedTokenAddressSync,
  getMintLen,
  ExtensionType,
  TYPE_SIZE,
  LENGTH_SIZE,
} from "@solana/spl-token";
import { createInitializeInstruction, pack, type TokenMetadata } from "@solana/spl-token-metadata";
import { scanUrl, solanaRpc } from "./onchain-config";
import { loadServiceKeypair } from "./orbitx-signer";

export type MintedSealNft = {
  mint: string;
  signature: string;
  explorerUrl: string;
};

export async function mintSealNft(input: {
  name: string;
  symbol: string;
  uri: string;
}): Promise<MintedSealNft> {
  const payer = loadServiceKeypair();
  const conn = new Connection(solanaRpc(), { commitment: "confirmed", disableRetryOnRateLimit: true });
  const mintKeypair = Keypair.generate();
  const metadata: TokenMetadata = {
    mint: mintKeypair.publicKey,
    name: input.name.slice(0, 32),
    symbol: input.symbol.replace(/^\$/, "").slice(0, 10),
    uri: input.uri.slice(0, 200),
    additionalMetadata: [],
  };
  const mintLen = getMintLen([ExtensionType.MetadataPointer]);
  const metadataLen = TYPE_SIZE + LENGTH_SIZE + pack(metadata).length;
  const lamports = await conn.getMinimumBalanceForRentExemption(mintLen + metadataLen);
  const ata = getAssociatedTokenAddressSync(mintKeypair.publicKey, payer.publicKey, false, TOKEN_2022_PROGRAM_ID);
  const tx = new Transaction().add(
    SystemProgram.createAccount({
      fromPubkey: payer.publicKey,
      newAccountPubkey: mintKeypair.publicKey,
      space: mintLen,
      lamports,
      programId: TOKEN_2022_PROGRAM_ID,
    }),
    createInitializeMetadataPointerInstruction(
      mintKeypair.publicKey,
      payer.publicKey,
      mintKeypair.publicKey,
      TOKEN_2022_PROGRAM_ID,
    ),
    createInitializeMintInstruction(mintKeypair.publicKey, 0, payer.publicKey, payer.publicKey, TOKEN_2022_PROGRAM_ID),
    createInitializeInstruction({
      programId: TOKEN_2022_PROGRAM_ID,
      metadata: mintKeypair.publicKey,
      updateAuthority: payer.publicKey,
      mint: mintKeypair.publicKey,
      mintAuthority: payer.publicKey,
      name: metadata.name,
      symbol: metadata.symbol,
      uri: metadata.uri,
    }),
    createAssociatedTokenAccountInstruction(
      payer.publicKey,
      ata,
      payer.publicKey,
      mintKeypair.publicKey,
      TOKEN_2022_PROGRAM_ID,
    ),
    createMintToInstruction(mintKeypair.publicKey, ata, payer.publicKey, 1, [], TOKEN_2022_PROGRAM_ID),
  );
  const signature = await sendAndConfirmTransaction(conn, tx, [payer, mintKeypair], {
    commitment: "confirmed",
    maxRetries: 3,
  });
  return { mint: mintKeypair.publicKey.toBase58(), signature, explorerUrl: scanUrl(signature) };
}
