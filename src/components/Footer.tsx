import Link from "next/link";

export function Footer() {
  return (
    <footer className="relative z-10 border-t border-gold/15 bg-black/40">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-8 text-xs text-ivory/55 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/mark.svg" alt="" width={22} height={22} />
          <p className="tracking-[0.2em] uppercase">Apogee · unaffiliated with Robinhood Markets, Inc. and pons</p>
        </div>
        <div className="flex flex-wrap gap-4">
          <Link href="/launches" className="hover:text-gold">
            Launches
          </Link>
          <Link href="/privacy" className="hover:text-gold">
            Privacy
          </Link>
          <Link href="/terms" className="hover:text-gold">
            Terms
          </Link>
          <Link href="/usage" className="hover:text-gold">
            Usage
          </Link>
          <Link href="/docs" className="hover:text-gold">
            Docs
          </Link>
          <a href="https://www.ponsfamily.com/launchpad" className="hover:text-gold" target="_blank" rel="noreferrer">
            pons
          </a>
        </div>
      </div>
    </footer>
  );
}
