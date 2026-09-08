import { OrbitChat } from "@/components/OrbitChat";
import { PageFrame, PageHero } from "@/components/PageHero";
import { LEGAL } from "@/lib/site";

export default function OrbitPage() {
  return (
    <main>
      <PageHero
        compact
        kicker="Chat · Phantom · pons"
        title="Orbit"
        lede="Scan, track a wallet, or ask to launch a token. Orbit calls live MCP tools. If NVIDIA_API_KEY is set, replies go through NVIDIA NIM with tool calling; otherwise the MCP tool agent still returns real data."
      />
      <PageFrame>
        <OrbitChat />
        <p className="text-xs leading-relaxed text-ivory/65">{LEGAL.keys}</p>
      </PageFrame>
    </main>
  );
}
