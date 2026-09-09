"use client";

import { useEffect, useMemo, useState } from "react";
import { SEAL_NOTE_MAX, SERVICE_WALLET_PUBLIC } from "@/lib/onchain-config";
import { readResponseJson } from "@/lib/read-json";
import { useWallet } from "./WalletProvider";
import { SolscanMemoLinks } from "./SolscanMemoLinks";

type TokenCard = {
  id: string;
  mint: string;
  symbol: string;
  name: string;
  burnUsd: number;
  priceUsd: number | null;
};

type Seal = {
  id: string;
  note: string;
  tokenMint: string;
  tokenSymbol: string;
  imageUrl: string;
  nftMint: string;
  memoTx: string | null;
  buyTx: string | null;
  burnTx: string | null;
  memoUrl: string | null;
  buyUrl: string | null;
  burnUrl: string | null;
  tokenAmount: number | null;
  usdValue: number | null;
  createdAt: string;
  error: string | null;
  buyStatus: string;
  burnStatus: string;
};

type Info = {
  wallet?: string;
  ready?: boolean;
  notesEnabled?: boolean;
  autoBurnEnabled?: boolean;
  sol?: number | null;
  sealBurnUsd?: number;
  tokens?: TokenCard[];
  items?: Seal[];
};

async function fileToImagePayload(file: File): Promise<{ imageBase64: string; imageMime: string }> {
  const bitmap = await createImageBitmap(file);
  const max = 512;
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not read the image.");
  ctx.drawImage(bitmap, 0, 0, width, height);
  let quality = 0.72;
  let dataUrl = canvas.toDataURL("image/jpeg", quality);
  while (dataUrl.length > 280_000 && quality > 0.4) {
    quality -= 0.08;
    dataUrl = canvas.toDataURL("image/jpeg", quality);
  }
  const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, "");
  return { imageBase64: base64, imageMime: "image/jpeg" };
}

export function OnchainSealComposer() {
  const { address, verified } = useWallet();
  const [info, setInfo] = useState<Info | null>(null);
  const [tokenMint, setTokenMint] = useState<string>("");
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [last, setLast] = useState<Seal | null>(null);

  const remaining = SEAL_NOTE_MAX - text.length;
  const tokens = info?.tokens || [];

  async function refresh() {
    try {
      const json = await fetch("/api/onchain/seals?limit=20").then((r) => readResponseJson<Info>(r));
      setInfo(json);
      setTokenMint((prev) => prev || json.tokens?.[0]?.mint || "");
    } catch {
      /* keep last-good composer state */
    }
  }

  useEffect(() => {
    void refresh();
    const t = setInterval(() => void refresh(), 12_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const canWrite = useMemo(
    () => Boolean(tokenMint && text.trim() && file && remaining >= 0 && !busy),
    [tokenMint, text, file, remaining, busy],
  );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const image = await fileToImagePayload(file);
      const res = await fetch("/api/onchain/seals", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          token: tokenMint,
          note: text,
          ...image,
          wallet: verified ? address : undefined,
        }),
      });
      const json = await readResponseJson<{ error?: string; seal?: Seal }>(res);
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      if (!json.seal) throw new Error("Seal was sent but the receipt was empty.");
      setLast(json.seal);
      setText("");
      setFile(null);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={submit} className="panel rounded-2xl p-5">
        <p className="kicker">Pick a token, write a memo, mint the image</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {tokens.map((token) => {
            const active = token.mint === tokenMint;
            return (
              <button
                key={token.mint}
                type="button"
                onClick={() => setTokenMint(token.mint)}
                className={`rounded-2xl border px-4 py-3 text-left ${active ? "border-ember bg-ember/10" : "border-white/10"}`}
              >
                <p className="font-heading text-lg text-ivory">{token.symbol}</p>
                <p className="text-[12px] text-ivory/60">{token.name}</p>
                <p className="mt-2 font-mono text-[11px] text-ivory/45">{token.mint.slice(0, 4)}…{token.mint.slice(-4)}</p>
                <p className="mt-1 text-[12px] text-ivory/70">
                  Burn ${token.burnUsd.toFixed(2)}
                  {token.priceUsd != null ? ` · $${Number(token.priceUsd).toPrecision(4)}` : ""}
                </p>
              </button>
            );
          })}
        </div>
        <label htmlFor="seal-note" className="kicker mt-6 block">
          Permanent memo
        </label>
        <textarea
          id="seal-note"
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, SEAL_NOTE_MAX))}
          rows={4}
          placeholder="This text and image are public forever. Do not include secrets."
          className="field mt-3 w-full rounded-xl"
        />
        <div className="mt-3">
          <label className="kicker" htmlFor="seal-image">
            Image to mint
          </label>
          <input
            id="seal-image"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="mt-2 block w-full text-sm text-ivory/70"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="" className="mt-3 max-h-48 rounded-xl border border-white/10 object-contain" />
          ) : null}
        </div>
        <p className="mt-3 text-[12px] text-ivory/55">
          {remaining} characters left. Each seal buys and burns up to ${info?.sealBurnUsd ?? 0.25} of the selected
          token, funded by the Apogee service wallet. The image is uploaded to Irys/Arweave and minted as a 1/1.
          {info && !info.ready ? " Service wallet key is not configured on this host — seals will not sign." : ""}
        </p>
        <button type="submit" className="btn-primary mt-4" disabled={!canWrite || info?.notesEnabled === false}>
          {busy ? "Writing on-chain…" : "Mint memo + burn"}
        </button>
        {error ? <p className="mt-3 text-sm text-flare">{error}</p> : null}
      </form>

      {last ? <SealReceipt seal={last} /> : null}

      <section>
        <h3 className="font-heading text-xl text-ivory">Seal history</h3>
        <p className="mt-1 text-sm text-ivory/65">Confirmed service-wallet seals. Image, memo, buy, and burn stay on-chain.</p>
        <div className="mt-3 space-y-3">
          {(info?.items || []).map((s) => (
            <SealReceipt key={s.id} seal={s} compact />
          ))}
          {!info?.items?.length ? <p className="text-sm text-ivory/60">No token seals yet.</p> : null}
        </div>
      </section>
    </div>
  );
}

function SealReceipt({ seal, compact }: { seal: Seal; compact?: boolean }) {
  return (
    <article className={`panel rounded-2xl p-4 ${compact ? "" : "border-emerald-500/30"}`}>
      <p className="text-[11px] uppercase tracking-[0.16em] text-emerald-300">{seal.tokenSymbol} seal</p>
      <blockquote className="mt-2 text-ivory">«{seal.note}»</blockquote>
      {seal.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={seal.imageUrl} alt="" className="mt-3 max-h-56 rounded-xl border border-white/10 object-contain" />
      ) : null}
      <p className="mt-2 font-mono text-[11px] text-ivory/50">{seal.tokenMint}</p>
      {seal.nftMint ? <p className="font-mono text-[11px] text-ivory/50">NFT {seal.nftMint}</p> : null}
      <p className="mt-2 text-[12px] text-ivory/70">
        Buy {seal.buyStatus} · Burn {seal.burnStatus}
        {seal.usdValue != null ? ` · $${seal.usdValue}` : ""}
      </p>
      {seal.error ? <p className="mt-2 text-sm text-flare">{seal.error}</p> : null}
      <div className="mt-2 flex flex-wrap gap-3 text-[12px]">
        {seal.memoTx ? <SolscanMemoLinks signature={seal.memoTx} wallet={SERVICE_WALLET_PUBLIC} /> : null}
        {seal.buyUrl ? (
          <a className="text-ember" href={seal.buyUrl} target="_blank" rel="noreferrer">
            Buy TX →
          </a>
        ) : null}
        {seal.burnUrl ? (
          <a className="text-ember" href={seal.burnUrl} target="_blank" rel="noreferrer">
            Burn TX →
          </a>
        ) : null}
        {seal.imageUrl ? (
          <a className="text-ember" href={seal.imageUrl} target="_blank" rel="noreferrer">
            Image →
          </a>
        ) : null}
      </div>
    </article>
  );
}
