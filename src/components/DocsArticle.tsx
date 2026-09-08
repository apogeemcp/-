import { ArchDiagram } from "./ArchDiagram";
import { CodeBlock } from "./CodeBlock";
import { TestConnection } from "./TestConnection";
import type { DocBlock } from "@/lib/docs-articles";

export function DocsArticle({
  kicker,
  title,
  lede,
  body,
}: {
  kicker: string;
  title: string;
  lede: string;
  body: DocBlock[];
}) {
  return (
    <article className="space-y-5">
      <header>
        <p className="kicker">{kicker}</p>
        <h1 className="mt-2 font-display text-4xl text-ivory sm:text-5xl">{title}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ivory/75 sm:text-base">{lede}</p>
      </header>
      {body.map((block, i) => (
        <Block key={i} block={block} />
      ))}
    </article>
  );
}

function Block({ block }: { block: DocBlock }) {
  if (block.type === "p") return <p className="text-sm leading-relaxed text-ivory/80 sm:text-base">{block.text}</p>;
  if (block.type === "h2") {
    return (
      <h2 id={block.id} className="scroll-mt-28 font-heading text-2xl text-ivory">
        {block.text}
      </h2>
    );
  }
  if (block.type === "h3") return <h3 className="font-heading text-xl text-ivory">{block.text}</h3>;
  if (block.type === "ul") {
    return (
      <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed text-ivory/80">
        {block.items.map((item) => (
          <li key={item.slice(0, 80)}>{item}</li>
        ))}
      </ul>
    );
  }
  if (block.type === "code") return <CodeBlock code={block.code} language={block.lang} label={block.label} />;
  if (block.type === "note") {
    return <p className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-ivory/80">{block.text}</p>;
  }
  if (block.type === "warn") {
    return <p className="rounded-xl border border-ember/40 bg-ember/10 px-4 py-3 text-sm text-ivory/85">{block.text}</p>;
  }
  if (block.type === "diagram") return <ArchDiagram variant={block.variant} />;
  if (block.type === "test") return <TestConnection />;
  return (
    <div className="flex flex-wrap gap-2">
      {block.items.map((l) => (
        <a key={l.href} href={l.href} className="btn-ghost text-sm">
          {l.label}
        </a>
      ))}
    </div>
  );
}
