"use client";

import { useState } from "react";

export function CodeBlock({
  code,
  language = "json",
  label,
}: {
  code: string;
  language?: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-black/55">
      <div className="flex items-center justify-between gap-3 border-b border-white/10 px-3 py-2">
        <p className="truncate font-mono text-[10px] uppercase tracking-[0.18em] text-ivory/45">
          {label || language}
        </p>
        <button
          type="button"
          className="shrink-0 text-[11px] text-gold hover:text-ivory"
          onClick={async () => {
            await navigator.clipboard.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 1400);
          }}
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="max-w-full overflow-x-auto whitespace-pre-wrap break-all p-4 font-mono text-[11px] leading-relaxed text-ivory/80 sm:break-normal">
        {code}
      </pre>
    </div>
  );
}
