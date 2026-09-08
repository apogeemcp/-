import { isAddress } from "./chain";
import { FOOTER, MORE_LINKS, TABS } from "./site";

export type SiteHit = { title: string; href: string; section: string; text: string };

export function siteSearchIndex(): SiteHit[] {
  const pages: SiteHit[] = [
    ...TABS.map((t) => ({ title: t.label, href: t.href, section: "App", text: `${t.label} ${t.hint || ""}` })),
    ...MORE_LINKS.map((l) => ({ title: l.label, href: l.href, section: "More", text: l.label })),
    ...FOOTER.legal.map((l) => ({ title: l.label, href: l.href, section: "Legal", text: l.label })),
    { title: "MCP tools", href: "/docs", section: "Developers", text: "scan_token get_desk prepare_pons_launch catalog" },
    { title: "MCP access", href: "/developers/access", section: "Developers", text: "auth none orbitx rental permanent" },
    { title: "Partners", href: "/developers/partners", section: "Developers", text: "partnership integrate mcp" },
    { title: "Wallet / Profile", href: "/wallet", section: "App", text: "phantom track pnl holdings" },
    { title: "Install PWA", href: "/connect", section: "App", text: "install home screen pwa" },
  ];
  const seen = new Set<string>();
  return pages.filter((p) => {
    const k = `${p.href}:${p.title}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

export function searchSite(query: string): SiteHit[] {
  const q = query.trim();
  if (!q) return [];
  const extra: SiteHit[] = [];
  if (isAddress(q)) {
    extra.push({ title: `Open token ${q.slice(0, 6)}…${q.slice(-4)}`, href: `/token/${q}`, section: "Token", text: q });
    extra.push({ title: `Track wallet ${q.slice(0, 6)}…${q.slice(-4)}`, href: `/wallet?address=${q}`, section: "Wallet", text: q });
  } else if (q.length <= 24) {
    extra.push({
      title: `Scan “${q}”`,
      href: `/dashboard?scan=${encodeURIComponent(q)}`,
      section: "Token",
      text: q,
    });
  }
  const needle = q.toLowerCase();
  const hits = siteSearchIndex().filter(
    (h) => h.title.toLowerCase().includes(needle) || h.section.toLowerCase().includes(needle) || h.text.toLowerCase().includes(needle),
  );
  return [...extra, ...hits].slice(0, 12);
}
