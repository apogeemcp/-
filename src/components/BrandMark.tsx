import Image from "next/image";
import Link from "next/link";
import { asset } from "@/lib/site";

export function BrandMark({ size = 32, wordmark = true }: { size?: number; wordmark?: boolean }) {
  return (
    <Link href="/" className="group flex min-w-0 items-center gap-2.5">
      <span className="relative shrink-0 overflow-hidden rounded-full ring-1 ring-white/20" style={{ width: size, height: size }}>
        <Image src={asset("/brand/icon.png")} alt="Apogee" width={size * 2} height={size * 2} className="h-full w-full object-cover" priority />
      </span>
      {wordmark ? (
        <span className="flex min-w-0 flex-col leading-none">
          <span className="font-display text-[17px] tracking-[0.18em] text-ivory sm:text-[18px] sm:tracking-[0.28em]">APOGEE</span>
          <span className="mt-1 hidden max-w-[14rem] truncate font-script text-[13px] text-gold/90 sm:inline">Robinhood Chain intel</span>
        </span>
      ) : null}
    </Link>
  );
}
