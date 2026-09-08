import Image from "next/image";
import Link from "next/link";

export function BrandMark({ size = 44, wordmark = true }: { size?: number; wordmark?: boolean }) {
  return (
    <Link href="/" className="group flex items-center gap-3">
      <span className="relative shrink-0 overflow-hidden rounded-full ring-1 ring-gold/50 group-hover:ring-ember" style={{ width: size, height: size }}>
        <Image
          src="/brand/icon.png?v=3"
          alt="Apogee"
          width={size * 2}
          height={size * 2}
          className="h-full w-full object-cover"
          priority
        />
      </span>
      {wordmark ? (
        <span className="flex flex-col leading-none">
          <span className="font-display text-lg tracking-[0.28em] text-ivory">APOGEE</span>
          <span className="hidden text-[9px] uppercase tracking-[0.28em] text-gold/80 sm:inline">RH Chain MCP</span>
        </span>
      ) : null}
    </Link>
  );
}
