import Image from "next/image";
import Link from "next/link";
import { asset } from "@/lib/site";

export function BrandMark({ size = 32, wordmark = true }: { size?: number; wordmark?: boolean }) {
  return (
    <Link href="/" className="group flex items-center gap-2.5">
      <span className="relative shrink-0 overflow-hidden rounded-full ring-1 ring-white/15" style={{ width: size, height: size }}>
        <Image src={asset("/brand/icon.png")} alt="Apogee" width={size * 2} height={size * 2} className="h-full w-full object-cover" priority />
      </span>
      {wordmark ? (
        <span className="flex flex-col leading-none">
          <span className="font-display text-[15px] tracking-[0.32em] text-ivory">APOGEE</span>
          <span className="mt-0.5 hidden text-[9px] uppercase tracking-[0.22em] text-ivory/40 sm:inline">Robinhood Chain MCP</span>
        </span>
      ) : null}
    </Link>
  );
}
