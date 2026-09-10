"use client";

import { useEffect, useMemo, useState } from "react";
import { SEAL_EDITION_CAP, SEAL_NOTE_MAX } from "@/lib/onchain-config";
import { readResponseJson } from "@/lib/read-json";
import { useWallet } from "./WalletProvider";
import { SealHoloCard, type SealCardData } from "./HoloCard";

type TokenCard = {
  id: string;
  mint: string;
  symbol: string;
  name: string;
  burnUsd: number;
  priceUsd: number | null;
};

type Info = {
  wallet?: string;
  ready?: boolean;
  notesEnabled?: boolean;
  autoBurnEnabled?: boolean;
  sol?: number | null;
  sealBurnUsd?: number;
  editionCap?: number;
  minted?: number;
  remaining?: number;
  soldOut?: boolean;
  tokens?: TokenCard[];
  items?: SealCardData[];
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
  const [last, setLast] = useState<SealCardData | null>(null);

  const remaining = SEAL_NOTE_MAX - text.length;
  const tokens = info?.tokens || [];
  const cap = info?.editionCap ?? SEAL_EDITION_CAP;
  const minted = info?.minted ?? 0;
  const left = info?.remaining ?? Math.max(0, cap - minted);
  const soldOut = Boolean(info?.soldOut);

  async function refresh() {
    try {
      const json = await fetch(`/api/onchain/seals?limit=${SEAL_EDITION_CAP}`).then((r) => readResponseJson<Info>(r));
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
    () => Boolean(!soldOut && tokenMint && text.trim() && file && remaining >= 0 && !busy),
    [soldOut, tokenMint, text, file, remaining, busy],
  );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!file || soldOut) return;
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
      const json = await readResponseJson<{ error?: string; seal?: SealCardData }>(res);
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
    <div className="space-y-8">
      <div className="panel relative overflow-hidden rounded-2xl px-5 py-4">
        <span className="saturn-orbit right-[-10%] top-[-80%] h-40 w-40 opacity-40" />
        <p className="kicker">Limited edition</p>
        <p className="mt-2 font-display text-3xl tracking-[0.12em] text-ivory">
          {String(minted).padStart(2, "0")} / {String(cap).padStart(2, "0")}
        </p>
        <p className="mt-1 text-sm text-ivory/70">
          {soldOut
            ? "The Saturn set is closed. No more seals will be minted."
            : `${left} card${left === 1 ? "" : "s"} remain. Each mint is one collector slot.`}
        </p>
      </div>

      {soldOut ? (
        <p className="rounded-2xl border border-gold/30 bg-gold/10 px-4 py-3 text-sm text-gold-bright">
          Edition complete. Browse the {cap} cards below — new writes are rejected on the website and MCP.
        </p>
      ) : (
        <form onSubmit={submit} className="panel rounded-2xl p-5">
          <p className="kicker">Pick a token, write a memo, mint the card</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {tokens.map((token) => {
              const active = token.mint === tokenMint;
              return (
                <button
                  key={token.mint}
                  type="button"
                  onClick={() => setTokenMint(token.mint)}
                  className={`rounded-2xl border px-4 py-3 text-left ${active ? "border-gold bg-gold/10" : "border-white/10"}`}
                >
                  <p className="font-heading text-lg text-ivory">{token.symbol}</p>
                  <p className="text-[12px] text-ivory/60">{token.name}</p>
                  <p className="mt-2 font-mono text-[11px] text-ivory/45">
                    {token.mint.slice(0, 4)}…{token.mint.slice(-4)}
                  </p>
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
              Image on the card
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
              <img src={preview} alt="" className="mt-3 max-h-48 rounded-xl border border-gold/20 object-contain" />
            ) : null}
          </div>
          <p className="mt-3 text-[12px] text-ivory/55">
            {remaining} characters left. Next card would be #
            {String(minted + 1).padStart(3, "0")}/{String(cap).padStart(3, "0")}. Burns up to $
            {info?.sealBurnUsd ?? 0.25} of the selected token. Image goes to Irys/Arweave as a 1/1.
            {info && !info.ready ? " Service wallet key is not configured on this host — seals will not sign." : ""}
          </p>
          <button type="submit" className="btn-primary mt-4" disabled={!canWrite || info?.notesEnabled === false}>
            {busy ? "Pressing the card…" : "Mint Saturn card"}
          </button>
          {error ? <p className="mt-3 text-sm text-flare">{error}</p> : null}
        </form>
      )}

      {last ? (
        <section>
          <p className="kicker">Your new card</p>
          <div className="mt-4 max-w-sm">
            <SealHoloCard seal={last} />
          </div>
        </section>
      ) : null}

      <section>
        <h3 className="font-heading text-3xl italic text-ivory">The set</h3>
        <p className="mt-1 text-sm text-ivory/65">
          Numbered oldest to newest. Image, memo, buy, and burn stay on-chain. {minted} of {cap} pressed.
        </p>
        <div className="mt-5 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {(info?.items || []).map((s) => (
            <SealHoloCard key={s.id} seal={s} />
          ))}
        </div>
        {!info?.items?.length ? <p className="mt-4 text-sm text-ivory/60">No Saturn cards yet. The first 50 people to mint close the set.</p> : null}
      </section>
    </div>
  );
}
