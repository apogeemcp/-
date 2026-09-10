import Image from "next/image";
import Link from "next/link";
import { asset } from "@/lib/site";

export function BrandMark({ size = 36, wordmark = true }: { size?: number; wordmark?: boolean }) {
  return (
    <Link href="/" className="group flex min-w-0 items-center gap-3">
      <span className="relative shrink-0" style={{ width: size, height: size }}>
        <span className="brand-orbit" />
        <span className="relative z-10 block overflow-hidden rounded-full ring-1 ring-gold/45" style={{ width: size, height: size }}>
          <Image src={asset("/brand/icon.png")} alt="Apogee" width={size * 2} height={size * 2} className="h-full w-full object-cover" priority />
        </span>
      </span>
      {wordmark ? (
        <span className="flex min-w-0 flex-col leading-none">
          <span className="font-display text-[15px] font-semibold tracking-[0.32em] text-ivory sm:text-[17px]">APOGEE</span>
          <span className="mt-1.5 hidden max-w-[16rem] truncate font-script text-[15px] text-gold-bright sm:inline">
            Saturn over Robinhood Chain
          </span>
        </span>
      ) : null}
    </Link>
  );
}
