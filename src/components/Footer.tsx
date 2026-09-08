import Link from "next/link";
import { BrandMark } from "./BrandMark";
import { asset, CANONICAL_MCP, LEGAL, MORE_LINKS, PRODUCT, TABS } from "@/lib/site";
import { CHAIN } from "@/lib/chain";

export function Footer() {
  return (
    <footer className="relative z-10 mt-8 border-t border-white/10 bg-[#070706] pb-24 md:pb-0">
      <div className="hairline" />
      <div className="relative overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={asset("/brand/banner.png")}
          alt=""
          className="pointer-events-none absolute inset-0 h-full w-full object-cover object-[72%_40%] opacity-[0.16]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#070706] via-[#070706]/88 to-[#070706]/75" />
        <div className="relative mx-auto grid max-w-6xl gap-10 px-5 py-14 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
          <div>
            <BrandMark size={28} />
            <p className="mt-3 text-sm leading-relaxed text-ivory/55">{PRODUCT.tag}</p>
            <p className="mt-4 break-all font-mono text-[11px] text-gold">{CANONICAL_MCP}</p>
            <p className="mt-3 text-[11px] leading-relaxed text-ivory/40">{LEGAL.affiliation}</p>
          </div>
          <div>
            <p className="kicker">App</p>
            <ul className="mt-3 space-y-2 text-sm text-ivory/70">
              {TABS.map((t) => (
                <li key={t.href}>
                  <Link href={t.href} className="hover:text-gold">
                    {t.label}
                    {t.hint ? <span className="text-ivory/30"> · {t.hint}</span> : null}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="kicker">Setup & legal</p>
            <ul className="mt-3 space-y-2 text-sm text-ivory/70">
              {MORE_LINKS.map((t) => (
                <li key={t.href}>
                  <Link href={t.href} className="hover:text-gold">
                    {t.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="kicker">Network</p>
            <ul className="mt-3 space-y-2 text-sm text-ivory/65">
              <li>
                {CHAIN.name} · {CHAIN.id}
              </li>
              <li>Slug {CHAIN.slug}</li>
              <li>
                {PRODUCT.toolCount} catalog ops · v{PRODUCT.version}
              </li>
              <li>Updated {LEGAL.updated}</li>
            </ul>
            <p className="mt-4 text-[11px] leading-relaxed text-ivory/40">{LEGAL.pons}</p>
          </div>
        </div>
      </div>
      <div className="border-t border-white/5">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-5 py-5 text-[11px] leading-relaxed text-ivory/35 sm:px-6">
          <p>{LEGAL.stock}</p>
          <p>{LEGAL.keys}</p>
          <p>
            © {new Date().getFullYear()} {PRODUCT.name} · v{PRODUCT.version} · {LEGAL.updated}
          </p>
        </div>
      </div>
    </footer>
  );
}
