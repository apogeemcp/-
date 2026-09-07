import Link from "next/link";

export function Footer() {
  return (
    <footer className="relative z-10 border-t border-gold/15 bg-black/40">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-8 text-xs text-ivory/55 sm:flex-row sm:items-center sm:justify-between">
        <p className="tracking-[0.2em] uppercase">Apogee · unaffiliated with Robinhood Markets, Inc.</p>
        <div className="flex flex-wrap gap-4">
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
        </div>
      </div>
    </footer>
  );
}
