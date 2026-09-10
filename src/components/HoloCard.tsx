import { SERVICE_WALLET_PUBLIC } from "@/lib/onchain-config";
import { SolscanMemoLinks } from "./SolscanMemoLinks";

export type SealCardData = {
  id: string;
  note: string;
  tokenMint: string;
  tokenSymbol: string;
  tokenName?: string;
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
  edition?: number;
  editionCap?: number;
};

export type NoteCardData = {
  id: string;
  note: string;
  memoTx: string | null;
  buyTx: string | null;
  burnTx: string | null;
  buyUrl: string | null;
  burnUrl: string | null;
  tokenAmount: number | null;
  usdValue: number | null;
  createdAt: string;
  error: string | null;
  memoStatus: string;
  buyStatus: string;
  burnStatus: string;
};

function serial(n?: number, cap?: number) {
  const edition = Math.max(0, n || 0);
  const total = Math.max(edition, cap || 50);
  return `#${String(edition || "—").padStart(3, "0")} / ${String(total).padStart(3, "0")}`;
}

function foil(status: string) {
  if (status === "confirmed") return "ON-CHAIN";
  if (status === "failed") return "FAULT";
  if (status === "pending") return "ASCENDING";
  return "IDLE";
}

export function SealHoloCard({ seal }: { seal: SealCardData }) {
  return (
    <article className="holo-card">
      <div className="holo-card-face rounded-[1.4rem] p-[10px]">
        <div className="relative z-[5] flex items-center justify-between px-1 pt-1 font-mono text-[10px] tracking-[0.18em] text-gold-bright">
          <span>SATURN SEAL</span>
          <span>{serial(seal.edition, seal.editionCap)}</span>
        </div>
        <div className="relative z-[5] mt-2 overflow-hidden rounded-[0.9rem] border border-gold/30 bg-black/50">
          <span className="saturn-orbit still inset-[-20%] opacity-40" />
          {seal.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={seal.imageUrl} alt="" className="relative z-[1] aspect-[4/3] w-full object-cover" />
          ) : (
            <div className="relative z-[1] flex aspect-[4/3] items-center justify-center font-display tracking-[0.2em] text-gold/50">
              NO IMAGE
            </div>
          )}
        </div>
        <div className="relative z-[5] mt-3 px-1">
          <p className="font-display text-2xl tracking-[0.14em] text-ivory">{seal.tokenSymbol}</p>
          <p className="text-[10px] uppercase tracking-[0.2em] text-gold/80">{seal.tokenName || "Limited edition"}</p>
          <p className="lede mt-3 min-h-[4.5rem] text-base leading-snug text-ivory/90">«{seal.note}»</p>
          <dl className="mt-3 grid grid-cols-2 gap-2 font-mono text-[10px] text-ivory/70">
            <div>
              <dt className="text-gold/70">BURN</dt>
              <dd>{seal.usdValue != null ? `$${seal.usdValue}` : "—"} · {foil(seal.burnStatus)}</dd>
            </div>
            <div>
              <dt className="text-gold/70">BUY</dt>
              <dd>
                {foil(seal.buyStatus)}
                {seal.tokenAmount != null ? ` · ${Number(seal.tokenAmount).toPrecision(4)}` : ""}
              </dd>
            </div>
            <div className="col-span-2">
              <dt className="text-gold/70">MINTED</dt>
              <dd>{new Date(seal.createdAt).toLocaleString()}</dd>
            </div>
            <div className="col-span-2 break-all">
              <dt className="text-gold/70">TOKEN</dt>
              <dd>{seal.tokenMint}</dd>
            </div>
            {seal.nftMint ? (
              <div className="col-span-2 break-all">
                <dt className="text-gold/70">NFT</dt>
                <dd>{seal.nftMint}</dd>
              </div>
            ) : null}
          </dl>
          {seal.error ? <p className="mt-2 text-xs text-flare">{seal.error}</p> : null}
          <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[11px] uppercase tracking-[0.14em]">
            {seal.memoTx ? <SolscanMemoLinks signature={seal.memoTx} wallet={SERVICE_WALLET_PUBLIC} /> : null}
            {seal.buyUrl ? (
              <a className="text-gold" href={seal.buyUrl} target="_blank" rel="noreferrer">
                Buy →
              </a>
            ) : null}
            {seal.burnUrl ? (
              <a className="text-gold" href={seal.burnUrl} target="_blank" rel="noreferrer">
                Burn →
              </a>
            ) : null}
            {seal.imageUrl ? (
              <a className="text-gold" href={seal.imageUrl} target="_blank" rel="noreferrer">
                Image →
              </a>
            ) : null}
            {seal.nftMint ? (
              <a
                className="text-gold"
                href={`https://solscan.io/token/${seal.nftMint}`}
                target="_blank"
                rel="noreferrer"
              >
                NFT →
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}

export function NoteHoloCard({ note }: { note: NoteCardData }) {
  return (
    <article className="holo-card">
      <div className="holo-card-face rounded-[1.4rem] p-[10px]">
        <div className="relative z-[5] flex items-center justify-between px-1 pt-1 font-mono text-[10px] tracking-[0.18em] text-gold-bright">
          <span>$ORBITX MEMO</span>
          <span>{foil(note.memoStatus)}</span>
        </div>
        <div className="relative z-[5] mt-2 flex aspect-[16/9] items-center justify-center overflow-hidden rounded-[0.9rem] border border-gold/30 bg-black/50">
          <span className="saturn-orbit still inset-[-30%] opacity-50" />
          <p className="relative z-[1] font-display text-3xl tracking-[0.2em] text-gold">NOTE</p>
        </div>
        <div className="relative z-[5] mt-3 px-1">
          <p className="lede min-h-[4.5rem] text-base leading-snug text-ivory/90">«{note.note}»</p>
          <dl className="mt-3 grid grid-cols-2 gap-2 font-mono text-[10px] text-ivory/70">
            <div>
              <dt className="text-gold/70">BURN</dt>
              <dd>{note.usdValue != null ? `$${note.usdValue}` : "—"} · {foil(note.burnStatus)}</dd>
            </div>
            <div>
              <dt className="text-gold/70">BUY</dt>
              <dd>
                {foil(note.buyStatus)}
                {note.tokenAmount != null ? ` · ${Number(note.tokenAmount).toPrecision(4)}` : ""}
              </dd>
            </div>
            <div className="col-span-2">
              <dt className="text-gold/70">WRITTEN</dt>
              <dd>{new Date(note.createdAt).toLocaleString()}</dd>
            </div>
          </dl>
          {note.error ? <p className="mt-2 text-xs text-flare">{note.error}</p> : null}
          <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[11px] uppercase tracking-[0.14em]">
            {note.memoTx ? <SolscanMemoLinks signature={note.memoTx} wallet={SERVICE_WALLET_PUBLIC} /> : null}
            {note.buyUrl ? (
              <a className="text-gold" href={note.buyUrl} target="_blank" rel="noreferrer">
                Buy →
              </a>
            ) : null}
            {note.burnUrl ? (
              <a className="text-gold" href={note.burnUrl} target="_blank" rel="noreferrer">
                Burn →
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}
