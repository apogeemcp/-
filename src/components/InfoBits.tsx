"use client";

import { GLOSSARY } from "@/lib/copy";

export function Hint({ id }: { id: keyof typeof GLOSSARY }) {
  const g = GLOSSARY[id];
  return (
    <details className="group relative inline-block align-middle">
      <summary className="ml-1 cursor-pointer list-none text-[10px] uppercase tracking-[0.14em] text-ember/90 marker:content-none after:content-['?']">
        <span className="sr-only">{g.term}</span>
      </summary>
      <p className="glass-3 absolute left-0 z-30 mt-2 w-64 p-3 text-left text-xs leading-relaxed text-ivory/85 sm:w-72">
        <span className="kicker">{g.term}</span>
        <span className="mt-2 block">{g.text}</span>
      </p>
    </details>
  );
}

export function GuidePanel({
  title,
  body,
  href,
}: {
  title: string;
  body: string;
  href?: string;
}) {
  return (
    <aside className="glass-2 p-5">
      <p className="kicker">Guide</p>
      <h2 className="mt-2 font-heading text-xl text-ivory">{title}</h2>
      <p className="mt-2 text-sm leading-relaxed text-ivory/80">{body}</p>
      {href ? (
        <a href={href} className="mt-3 inline-block text-sm text-ember hover:text-ivory">
          More guides →
        </a>
      ) : null}
    </aside>
  );
}

export function Accordion({
  items,
}: {
  items: readonly { q: string; a: string }[] | Array<{ q: string; a: string }>;
}) {
  return (
    <div className="space-y-2">
      {items.map((item) => (
        <details key={item.q} className="glass-2 group p-4">
          <summary className="cursor-pointer list-none font-heading text-base text-ivory marker:content-none">
            {item.q}
          </summary>
          <p className="mt-3 text-sm leading-relaxed text-ivory/80">{item.a}</p>
        </details>
      ))}
    </div>
  );
}
