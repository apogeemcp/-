import Link from "next/link";
import { BrandMark } from "./BrandMark";
import { CopyButton } from "./TokenMedia";
import { COMMUNITY, FOOTER, LEGAL, PRODUCT, PROJECT_CA } from "@/lib/site";
import { CHAIN } from "@/lib/chain";

export function Footer() {
  return (
    <footer className="relative z-10 mt-8 overflow-hidden border-t border-gold/15 pb-24 md:pb-0">
      <div className="hairline" />
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-t from-[#05040a] via-[#120908]/92 to-[#05040a]/80" />
        <span className="pointer-events-none absolute left-1/2 top-[-40%] h-[36rem] w-[36rem] -translate-x-1/2">
          <span className="saturn-orbit inset-0 opacity-50" />
        </span>
        <p className="pointer-events-none absolute -bottom-10 left-[-4%] select-none font-display text-[18vw] font-semibold leading-none tracking-[0.08em] text-gold/[0.06]">
          APOGEE
        </p>
        <div className="relative mx-auto grid max-w-6xl gap-10 px-5 py-16 sm:grid-cols-2 sm:px-6 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <BrandMark size={32} />
            <p className="mt-4 font-display text-[11px] uppercase tracking-[0.22em] text-gold">{FOOTER.line}</p>
            <p className="lede mt-3 max-w-sm text-lg leading-relaxed text-ivory/80">{PRODUCT.tag}</p>
            <p className="mt-4 text-[11px] leading-relaxed text-ivory/60">{LEGAL.affiliation}</p>
          </div>
          <div>
            <p className="kicker">Platform</p>
            <ul className="mt-4 space-y-2.5 text-sm text-ivory/80">
              {FOOTER.platform.map((t) => (
                <li key={t.href}>
                  <Link href={t.href} className="transition hover:text-gold">
                    {t.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/wallet" className="transition hover:text-gold">
                  Profile
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="kicker">Resources</p>
            <ul className="mt-4 space-y-2.5 text-sm text-ivory/80">
              {FOOTER.resources.map((t) => (
                <li key={t.href}>
                  <Link href={t.href} className="transition hover:text-gold">
                    {t.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/connect" className="transition hover:text-gold">
                  Connect MCP
                </Link>
              </li>
            </ul>
            <p className="kicker mt-7">Legal</p>
            <ul className="mt-4 space-y-2.5 text-sm text-ivory/80">
              {FOOTER.legal.map((t) => (
                <li key={t.href}>
                  <Link href={t.href} className="transition hover:text-gold">
                    {t.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="kicker">Community</p>
            <ul className="mt-4 space-y-2.5 text-sm text-ivory/80">
              <li>
                <a href={COMMUNITY.telegram} target="_blank" rel="noopener noreferrer" className="transition hover:text-gold">
                  Telegram
                </a>
              </li>
              <li>
                <a href={COMMUNITY.x} target="_blank" rel="noopener noreferrer" className="transition hover:text-gold">
                  X
                </a>
              </li>
              <li>
                <a href={COMMUNITY.github} target="_blank" rel="noopener noreferrer" className="transition hover:text-gold">
                  GitHub
                </a>
              </li>
            </ul>
            <p className="kicker mt-7">Token</p>
            <p className="mt-3 font-mono text-[11px] text-gold/90">
              {PROJECT_CA.slice(0, 6)}…{PROJECT_CA.slice(-4)}
            </p>
            <div className="mt-2">
              <CopyButton value={PROJECT_CA} label="Copy CA" />
            </div>
          </div>
        </div>
      </div>
      <div className="border-t border-gold/10">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-5 py-6 text-[11px] leading-relaxed text-ivory/60 sm:px-6">
          <p className="font-display tracking-[0.2em] text-gold/70">
            {CHAIN.name} {CHAIN.id} · {PRODUCT.toolCount} ops · v{PRODUCT.version}
          </p>
          <p>{LEGAL.stock}</p>
          <p>{LEGAL.disclaimer}</p>
          <p>
            © {new Date().getFullYear()} {PRODUCT.name} · {LEGAL.updated}
          </p>
        </div>
      </div>
    </footer>
  );
}
