import { PageFrame, PageHero } from "@/components/PageHero";
import { TOOLS, MCP_INSTRUCTIONS } from "@/lib/tools";
import { LEGAL, PRODUCT, mcpHttpUrl } from "@/lib/site";

export default function DocsPage() {
  const http = mcpHttpUrl();
  return (
    <main>
      <PageHero
        compact
        kicker="Reference"
        title="Tools"
        lede={`${http} · ${PRODUCT.toolCount} catalog operations · ${TOOLS.length} listed for MCP clients. Last updated ${LEGAL.updated}.`}
      />
      <PageFrame>
        <pre className="panel whitespace-pre-wrap rounded-xl p-5 font-mono text-[11px] leading-relaxed text-ivory/65">
          {MCP_INSTRUCTIONS}
        </pre>
        <ol className="space-y-3">
          {TOOLS.map((t, i) => (
            <li key={t.name} className="panel rounded-xl p-5">
              <p className="font-mono text-sm text-gold">
                {i + 1}. {t.name}
              </p>
              <p className="mt-2 text-sm text-ivory/70">{t.description}</p>
              <pre className="mt-3 overflow-x-auto font-mono text-[11px] text-ivory/35">
                {JSON.stringify(t.inputSchema, null, 2)}
              </pre>
            </li>
          ))}
        </ol>
      </PageFrame>
    </main>
  );
}
