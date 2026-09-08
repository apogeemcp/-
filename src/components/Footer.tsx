import Link from "next/link";
import { BrandMark } from "./BrandMark";
import { CopyButton } from "./TokenMedia";
import { COMMUNITY, FOOTER, LEGAL, PRODUCT, PROJECT_CA } from "@/lib/site";
import { CHAIN } from "@/lib/chain";

export function Footer() {
  return (
    <footer className="relative z-10 mt-8 border-t border-white/10 pb-24 md:pb-0">
      <div className="hairline" />
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-[#07070a] via-[#120608]/90 to-[#07070a]/80" />
        <span className="orbit-ring opacity-30" />
        <div className="relative mx-auto grid max-w-6xl gap-10 px-5 py-14 sm:grid-cols-2 sm:px-6 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <BrandMark size={28} />
            <p className="mt-3 font-script text-xl text-ember">{FOOTER.line}</p>
            <p className="mt-2 text-sm leading-relaxed text-ivory/75">{PRODUCT.tag}</p>
            <p className="mt-4 text-[11px] leading-relaxed text-ivory/65">{LEGAL.affiliation}</p>
          </div>
          <div>
            <p className="kicker">Platform</p>
            <ul className="mt-3 space-y-2 text-sm text-ivory/80">
              {FOOTER.platform.map((t) => (
                <li key={t.href}>
                  <Link href={t.href} className="hover:text-ember">
                    {t.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/wallet" className="hover:text-ember">
                  Profile
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="kicker">Resources</p>
            <ul className="mt-3 space-y-2 text-sm text-ivory/80">
              {FOOTER.resources.map((t) => (
                <li key={t.href}>
                  <Link href={t.href} className="hover:text-ember">
                    {t.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/connect" className="hover:text-ember">
                  Connect MCP
                </Link>
              </li>
            </ul>
            <p className="kicker mt-5">Legal</p>
            <ul className="mt-3 space-y-2 text-sm text-ivory/80">
              {FOOTER.legal.map((t) => (
                <li key={t.href}>
                  <Link href={t.href} className="hover:text-ember">
                    {t.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="kicker">Community</p>
            <ul className="mt-3 space-y-2 text-sm text-ivory/80">
              <li>
                <a href={COMMUNITY.telegram} target="_blank" rel="noreferrer" className="hover:text-ember">
                  Telegram
                </a>
              </li>
              <li>
                <a href={COMMUNITY.x} target="_blank" rel="noreferrer" className="hover:text-ember">
                  X
                </a>
              </li>
              <li>
                <a href={COMMUNITY.github} target="_blank" rel="noreferrer" className="hover:text-ember">
                  GitHub
                </a>
              </li>
            </ul>
            <p className="kicker mt-5">Token</p>
            <p className="mt-2 font-mono text-[11px] text-ivory/80">
              {PROJECT_CA.slice(0, 6)}…{PROJECT_CA.slice(-4)}
            </p>
            <div className="mt-2">
              <CopyButton value={PROJECT_CA} label="Copy CA" />
            </div>
          </div>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-5 py-5 text-[11px] leading-relaxed text-ivory/65 sm:px-6">
          <p>
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
