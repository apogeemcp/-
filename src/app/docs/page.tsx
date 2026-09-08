import { TOOLS, MCP_INSTRUCTIONS } from "@/lib/tools";
import { mcpHttpUrl, PRODUCT } from "@/lib/site";

export default function DocsPage() {
  const http = mcpHttpUrl();
  return (
    <main className="mx-auto max-w-3xl px-5 pb-24 pt-28">
      <p className="text-[11px] uppercase tracking-[0.3em] text-gold">Reference</p>
      <h1 className="mt-2 font-display text-4xl">Tools</h1>
      <p className="mt-3 text-ivory/70">
        Remote MCP: <code className="font-mono text-gold">{http}</code> · {PRODUCT.toolCount} catalog operations ·{" "}
        {TOOLS.length} listed for clients
      </p>
      <pre className="mt-6 whitespace-pre-wrap rounded-2xl border border-gold/20 bg-black/40 p-4 font-mono text-[11px] text-ivory/70">
        {MCP_INSTRUCTIONS}
      </pre>
      <ol className="mt-10 space-y-6">
        {TOOLS.map((t, i) => (
          <li key={t.name} className="glass rounded-2xl p-5">
            <p className="font-mono text-sm text-gold">
              {i + 1}. {t.name}
            </p>
            <p className="mt-2 text-sm text-ivory/75">{t.description}</p>
            <pre className="mt-3 overflow-x-auto font-mono text-[11px] text-ivory/45">
              {JSON.stringify(t.inputSchema, null, 2)}
            </pre>
          </li>
        ))}
      </ol>
    </main>
  );
}
