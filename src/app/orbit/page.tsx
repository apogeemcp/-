import { OrbitChat } from "@/components/OrbitChat";
import { GuidePanel } from "@/components/InfoBits";
import { PageFrame, PageHero } from "@/components/PageHero";
import { GUIDES } from "@/lib/copy";
import { LEGAL } from "@/lib/site";

export default function OrbitPage() {
  return (
    <main>
      <PageHero
        compact
        focus="orbit"
        kicker="Chat · Phantom · pons"
        title="Orbit"
        lede="Scan, track a wallet, or ask to launch a token. Orbit calls live MCP tools. If NVIDIA_API_KEY is set, replies go through NVIDIA NIM with tool calling; otherwise the MCP tool agent still returns real data."
      />
      <PageFrame>
        <GuidePanel title={GUIDES.orbit.title} body={GUIDES.orbit.body} href="/guides" />
        <OrbitChat />
        <p className="text-xs leading-relaxed text-ivory/65">{LEGAL.keys}</p>
      </PageFrame>
    </main>
  );
}
