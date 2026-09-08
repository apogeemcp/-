import { isAddress } from "./chain";
import { dispatchTool } from "./dispatch";
import { nvidiaChat, nvidiaEnabled, type ChatMsg } from "./nvidia";
import { TOOLS } from "./tools";
import { CANONICAL_MCP, LEGAL, PRODUCT } from "./site";

type AgentMessage = { role: "user" | "assistant" | "tool"; content: string };

const SYSTEM = `You are Orbit, the Apogee assistant for Robinhood Chain (EIP-155 ${PRODUCT.chain.id}, DexScreener slug robinhood).
Canonical MCP: ${CANONICAL_MCP}. Catalog: ${PRODUCT.toolCount} operations.
Rules:
- Call tools for live prices, wallets, charts, pons launches, and analytics. Never invent numbers.
- Resolve tokens by contract. Tickers collide.
- Never ask for a seed phrase or private key.
- prepare_pons_launch returns an unsigned tx; the user signs in Phantom. Do not claim a launch executed without a tx hash.
- Write pons lowercase. ${LEGAL.affiliation}
- Stock Tokens: ${LEGAL.stock}
- If a tool fails, explain it and continue.
Keep replies concise, scannable, and specific.`;

function extractAddress(text: string): string | undefined {
  return text.match(/0x[a-fA-F0-9]{40}/)?.[0];
}

function extractTicker(text: string): string | undefined {
  return text.match(/\b\$?([A-Z]{2,6})\b/)?.[1];
}

function extractLaunch(text: string): { name?: string; symbol?: string } {
  const named = text.match(/named\s+["']?([^"'.,\n]+)["']?/i);
  const ticker = text.match(/(?:ticker|symbol|\$)\s*([A-Za-z0-9]{1,10})/i);
  const launch = text.match(/launch(?:\s+token)?\s+["']?([A-Za-z0-9 ._-]{1,40})["']?/i);
  return {
    name: named?.[1]?.trim() || launch?.[1]?.trim(),
    symbol: ticker?.[1]?.toUpperCase(),
  };
}

function clip(value: unknown, max = 2800): string {
  const s = typeof value === "string" ? value : JSON.stringify(value);
  return s.length > max ? `${s.slice(0, max)}…` : s;
}

function money(n: unknown): string {
  const v = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(v)) return "—";
  if (Math.abs(v) >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
  if (Math.abs(v) >= 1_000) return `$${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  if (Math.abs(v) < 0.01 && v !== 0) return `$${v.toExponential(2)}`;
  return `$${v.toLocaleString(undefined, { maximumFractionDigits: 6 })}`;
}

function summarize(tool: string, result: unknown): string {
  const r = result as Record<string, unknown>;
  if (!r) return `${tool}: no result`;
  if (r.ok === false) return `${tool} failed: ${r.error || "unknown error"}`;
  if (tool === "scan_token" || tool === "get_token") {
    const t = (r.token || r) as Record<string, unknown>;
    return [
      `${t.symbol || t.name || "token"} ${t.address || ""}`.trim(),
      `price ${money(t.priceUsd)} · liq ${money(t.liquidity || t.liquidityUsd)} · vol ${money(t.volume24h)}`,
      r.verdict ? String(r.verdict) : "",
    ]
      .filter(Boolean)
      .join("\n");
  }
  if (tool === "track_wallet" || tool === "get_wallet_pnl") {
    return `Wallet ${r.address} · equity ${money(r.equityUsd)} (mark-to-market). ${r.note || ""}`.trim();
  }
  if (tool === "get_desk" || tool === "get_market_overview") {
    const chain = (r.chain || r) as Record<string, unknown>;
    const trend = Array.isArray(r.trending) ? (r.trending as Array<{ name?: string; symbol?: string; change1h?: number }>).slice(0, 5) : [];
    const names = trend.map((t) => `${t.symbol || t.name || "pool"}${t.change1h != null ? ` ${Number(t.change1h).toFixed(1)}%` : ""}`).join(", ");
    return [
      `Desk: block ${chain.block ?? "—"} · TVL ${money(chain.tvlUsd ?? r.tvlUsd)} · gas ${r.gas ?? chain.gas ?? "—"}`,
      names ? `Trending: ${names}` : "",
    ]
      .filter(Boolean)
      .join("\n");
  }
  if (tool === "list_pons_launches" || tool === "list_launches") {
    const n = Array.isArray(r.launches) ? r.launches.length : 0;
    return `${n} pons launches in this window. Graduation is not quality.`;
  }
  if (tool === "prepare_pons_launch") {
    return clip(r);
  }
  return clip(r, 1600);
}

const NIM_TOOLS = TOOLS.slice(0, 28).map((t) => ({
  type: "function" as const,
  function: {
    name: t.name,
    description: t.description,
    parameters: t.inputSchema,
  },
}));

async function nvidiaLoop(prompt: string, history: AgentMessage[]) {
  const calls: Array<{ tool: string; args: Record<string, unknown>; result: unknown }> = [];
  const messages: ChatMsg[] = [
    { role: "system", content: SYSTEM },
    ...history.slice(-8).map((m) => ({ role: m.role === "tool" ? ("user" as const) : m.role, content: m.content })),
    { role: "user", content: prompt },
  ];
  let prepared: unknown;
  for (let i = 0; i < 4; i++) {
    const turn = await nvidiaChat({ messages, tools: NIM_TOOLS });
    if (turn.tool_calls?.length) {
      messages.push({
        role: "assistant",
        content: turn.content || "",
        tool_calls: turn.tool_calls,
      });
      for (const tc of turn.tool_calls) {
        let args: Record<string, unknown> = {};
        try {
          args = JSON.parse(tc.function.arguments || "{}") as Record<string, unknown>;
        } catch {
          args = {};
        }
        let result: unknown;
        try {
          result = await dispatchTool(tc.function.name, args);
        } catch (error) {
          result = { ok: false, error: error instanceof Error ? error.message : String(error) };
        }
        calls.push({ tool: tc.function.name, args, result });
        if (tc.function.name === "prepare_pons_launch") prepared = result;
        messages.push({
          role: "tool",
          name: tc.function.name,
          tool_call_id: tc.id,
          content: clip(result, 4000),
        });
      }
      continue;
    }
    return {
      ok: true,
      intent: "nvidia",
      model: "nvidia-nim",
      reply: turn.content || "Done.",
      prepared,
      calls,
      history: [...history, { role: "user" as const, content: prompt }, { role: "assistant" as const, content: turn.content || "Done." }],
    };
  }
  return {
    ok: true,
    intent: "nvidia",
    model: "nvidia-nim",
    reply: "Stopped after several tool rounds. Ask a narrower question.",
    prepared,
    calls,
  };
}

export async function runAgent(prompt: string, history: AgentMessage[] = []) {
  const text = prompt.trim();
  if (nvidiaEnabled()) {
    try {
      return await nvidiaLoop(text, history);
    } catch (error) {
      const fallback = await heuristicAgent(text, history);
      return {
        ...fallback,
        nvidiaError: error instanceof Error ? error.message : String(error),
        reply: `${fallback.reply}\n\n(NVIDIA NIM unavailable: ${error instanceof Error ? error.message : String(error)}. Used live MCP tools instead.)`,
      };
    }
  }
  return heuristicAgent(text, history);
}

async function heuristicAgent(prompt: string, history: AgentMessage[]) {
  const text = prompt.trim();
  const lower = text.toLowerCase();
  const address = extractAddress(text);
  const ticker = extractTicker(text);
  const calls: Array<{ tool: string; args: Record<string, unknown>; result: unknown }> = [];

  const call = async (tool: string, args: Record<string, unknown>) => {
    try {
      const result = await dispatchTool(tool, args);
      calls.push({ tool, args, result });
      return result;
    } catch (error) {
      const result = { ok: false, error: error instanceof Error ? error.message : String(error) };
      calls.push({ tool, args, result });
      return result;
    }
  };

  let intent = "scan";
  if (/\b(launch|create token|deploy|pons launch)\b/.test(lower)) intent = "launch";
  else if (/\b(wallet|pnl|holdings|track wallet|portfolio)\b/.test(lower)) intent = "wallet";
  else if (/\b(trend|trending|desk|overview|market)\b/.test(lower)) intent = "desk";
  else if (/\b(chart|candle|ohlc)\b/.test(lower)) intent = "chart";
  else if (/\b(pons|launchpad|graduation|curve)\b/.test(lower)) intent = "pons";
  else if (/\b(connect|mcp|claude|gpt|grok|cursor)\b/.test(lower)) intent = "connect";
  else if (/\b(quote|premium|oracle)\b/.test(lower)) intent = "quote";
  else if (/\b(holder|holders)\b/.test(lower)) intent = "holders";
  else if (/\b(burn|buy|sell|flow|activity)\b/.test(lower)) intent = "activity";
  else if (/\b(analytic|volume|smart money|sniper)\b/.test(lower)) intent = "analytics";

  if (intent === "launch") {
    const draft = extractLaunch(text);
    const symbol = draft.symbol || ticker || "TOKEN";
    const name = draft.name || symbol;
    const prepared = await call("prepare_pons_launch", { name, symbol, description: text });
    return {
      ok: true,
      intent,
      model: "mcp-tools",
      reply: `Prepared a pons v2 launch for ${name} (${symbol}). Connect Phantom on Robinhood Chain (${PRODUCT.chain.id}) and sign the unsigned transaction. Launch fee is paid in ETH. Keys never leave your wallet.\n\n${summarize("prepare_pons_launch", prepared)}`,
      prepared,
      calls,
      history: [...history, { role: "user", content: text }, { role: "assistant", content: "Launch tx prepared." }],
    };
  }

  if (intent === "wallet") {
    if (!address) {
      return { ok: true, intent, model: "mcp-tools", reply: "Paste a 0x wallet to track, or connect Phantom on Profile.", calls };
    }
    const result = await call("track_wallet", { address });
    return { ok: true, intent, model: "mcp-tools", reply: summarize("track_wallet", result), calls };
  }

  if (intent === "desk") {
    const desk = await call("get_desk", {});
    return { ok: true, intent, model: "mcp-tools", reply: summarize("get_desk", desk), calls };
  }

  if (intent === "connect") {
    await call("get_mcp_info", {});
    return {
      ok: true,
      intent,
      model: "mcp-tools",
      reply: `Canonical MCP is ${CANONICAL_MCP} — one-click add on /connect. Auth none.`,
      calls,
    };
  }

  if (intent === "pons") {
    const result = address ? await call("get_pons_token", { address }) : await call("list_pons_launches", { limit: 12 });
    return { ok: true, intent, model: "mcp-tools", reply: summarize(address ? "get_pons_token" : "list_pons_launches", result), calls };
  }

  if (intent === "chart") {
    const q = address || ticker || "NVDA";
    const result = await call("get_chart", { query: q });
    return { ok: true, intent, model: "mcp-tools", reply: `Candles for ${q} on Robinhood Chain.\n${summarize("get_chart", result)}`, calls };
  }

  if (intent === "quote") {
    const q = ticker || "NVDA";
    const result = await call("get_stock_quote", { symbol: q });
    return { ok: true, intent, model: "mcp-tools", reply: summarize("get_stock_quote", result), calls };
  }

  if (intent === "holders") {
    const q = address || ticker;
    if (!q) return { ok: true, intent, model: "mcp-tools", reply: "Need a token address for holders.", calls };
    const result = await call("get_holders", { address: isAddress(q) ? q : address || q });
    return { ok: true, intent, model: "mcp-tools", reply: summarize("get_holders", result), calls };
  }

  if (intent === "activity") {
    const q = address || ticker || "NVDA";
    const result = await call("get_token_activity", { query: q });
    return { ok: true, intent, model: "mcp-tools", reply: summarize("get_token_activity", result), calls };
  }

  if (intent === "analytics") {
    const q = address || ticker || "NVDA";
    const a = await call("get_token_analytics", { query: q });
    await call("get_smart_money", { query: q });
    return { ok: true, intent, model: "mcp-tools", reply: summarize("get_token_analytics", a), calls };
  }

  const q = address || ticker || text;
  const scan = await call("scan_token", { query: q });
  return {
    ok: true,
    intent: "scan",
    model: "mcp-tools",
    reply: summarize("scan_token", scan),
    calls,
    history: [...history, { role: "user", content: text }, { role: "assistant", content: summarize("scan_token", scan) }],
  };
}
