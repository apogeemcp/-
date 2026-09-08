"use client";

import { useState } from "react";
import { ipfsGateways, letterMark } from "@/lib/media";

export function TokenMedia({
  src,
  symbol,
  name,
  size = 40,
}: {
  src?: string | null;
  symbol?: string | null;
  name?: string | null;
  size?: number;
}) {
  const urls = ipfsGateways(src);
  const [idx, setIdx] = useState(0);
  const url = idx < urls.length ? urls[idx] : null;
  if (!url) {
    return (
      <span
        className="inline-flex shrink-0 items-center justify-center rounded-full bg-gold/15 font-display text-gold ring-1 ring-white/10"
        style={{ width: size, height: size, fontSize: size * 0.42 }}
        aria-hidden
      >
        {letterMark(symbol, name)}
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt=""
      width={size}
      height={size}
      className="shrink-0 rounded-full object-cover ring-1 ring-white/15"
      onError={() => setIdx((i) => i + 1)}
    />
  );
}

export function CopyButton({ value, label = "Copy CA" }: { value: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="btn-ghost text-xs"
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        setDone(true);
        setTimeout(() => setDone(false), 1400);
      }}
    >
      {done ? "Copied" : label}
    </button>
  );
}
