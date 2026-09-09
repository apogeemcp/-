"use client";

import { SERVICE_WALLET_PUBLIC, solscanMemoViews } from "@/lib/onchain-config";

function utf8Hex(value: string) {
  return Array.from(new TextEncoder().encode(value))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function RawOnchainMemo({ memo }: { memo: string }) {
  const hex = utf8Hex(memo);
  return (
    <div className="mt-3 rounded-xl border border-white/10 bg-void/40 p-3">
      <p className="text-[10px] uppercase tracking-[0.16em] text-ivory/50">Raw on-chain memo</p>
      <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-all font-mono text-[11px] leading-relaxed text-gold">
        {memo}
      </pre>
      <p className="mt-2 text-[10px] uppercase tracking-[0.16em] text-ivory/50">UTF-8 hex</p>
      <pre className="mt-1 overflow-x-auto whitespace-pre-wrap break-all font-mono text-[11px] text-ivory/70">{hex}</pre>
    </div>
  );
}

export function SolscanMemoLinks({
  signature,
  wallet = SERVICE_WALLET_PUBLIC,
}: {
  signature: string;
  wallet?: string | null;
}) {
  const views = solscanMemoViews(signature, wallet || undefined);
  const links = [
    { href: views.tx, label: "Transaction" },
    { href: views.instructions, label: "Instructions" },
    { href: views.logs, label: "Program logs" },
    { href: views.raw, label: "Raw" },
    views.account ? { href: views.account, label: "Wallet txs" } : null,
  ].filter(Boolean) as Array<{ href: string; label: string }>;
  return (
    <div className="mt-3 space-y-1">
      <p className="text-[10px] uppercase tracking-[0.16em] text-ivory/45">
        Solscan · Overview often hides memos — open Instructions, Program logs, or Raw
      </p>
      <div className="flex flex-wrap gap-3 text-[12px]">
        {links.map((l) => (
          <a key={l.label} className="text-ember hover:text-ivory" href={l.href} target="_blank" rel="noreferrer">
            {l.label} →
          </a>
        ))}
      </div>
    </div>
  );
}
