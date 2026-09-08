import { LegalDoc } from "@/components/LegalDoc";
import { LEGAL } from "@/lib/site";
import { DATA_PROVIDERS } from "@/lib/docs";

export default function DataUsagePage() {
  return (
    <LegalDoc
      title="Data usage"
      body={[
        LEGAL.counsel,
        "Apogee does not claim ownership of blockchain state. Public chain data remains public. Apogee’s original work is the software, scoring, copy, and how results are assembled.",
        "Blockchain-native: blocks, receipts, ERC-20 metadata, pons factory logs, balances — read from RPC / contracts.",
        "Third-party: DexScreener pairs and trending, GeckoTerminal OHLCV and trades, DefiLlama TVL, RHJ Stock Token registry and oracle, Blockscout explorer APIs when reachable. Redistribution and commercial use of those payloads may be limited by each provider’s terms. Review those terms before you resell or bulk-copy their JSON.",
        "Apogee-calculated: scan scores, DEX vs RHJ premium (bps), mark-to-market equity, holder/flow proxies, graduation progress from on-chain reserves. These are calculations, not official market data feeds.",
        "Provider-specific terms still apply when you call MCP — passing data through MCP does not re-license it.",
        `Sources in code: ${DATA_PROVIDERS.map((p) => p.name).join("; ")}.`,
        LEGAL.pons,
        LEGAL.stock,
        "Do not treat MCP as a license to ignore DexScreener, Gecko, RHJ, or NVIDIA terms.",
        LEGAL.disclaimer,
      ]}
    />
  );
}
