import { isAddress } from "./chain";
import { dispatchTool } from "./dispatch";

type AgentMessage = { role: "user" | "assistant" | "tool"; content: string };

function extractAddress(text: string): string | undefined {
  const m = text.match(/0x[a-fA-F0-9]{40}/);
  return m?.[0];
}

function extractTicker(text: string): string | undefined {
  const m = text.match(/\b\$?([A-Z]{1,6})\b/);
  return m?.[1];
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

export async function runAgent(prompt: string, history: AgentMessage[] = []) {
  const text = prompt.trim();
  const lower = text.toLowerCase();
  const address = extractAddress(text);
  const ticker = extractTicker(text);
  const calls: Array<{ tool: string; args: Record<string, unknown>; result: unknown }> = [];

  const call = async (tool: string, args: Record<string, unknown>) => {
    const result = await dispatchTool(tool, args);
    calls.push({ tool, args, result });
    return result;
  };

  let intent = "scan";
  if (/\b(launch|create token|deploy|pons launch)\b/.test(lower)) intent = "launch";
  else if (/\b(wallet|pnl|holdings|track wallet|portfolio)\b/.test(lower)) intent = "wallet";
  else if (/\b(trend|trending|desk|overview|market)\b/.test(lower)) intent = "desk";
  else if (/\b(chart|candle|ohlc)\b/.test(lower)) intent = "chart";
  else if (/\b(pons|launchpad|graduation|curve)\b/.test(lower)) intent = "pons";
  else if (/\b(connect|mcp|claude|gpt|grok|cursor)\b/.test(lower)) intent = "connect";
  else if (/\b(quote|premium|oracle)\b/.test(lower)) intent = "quote";
  else if (/\b(analytic|volume|flow|smart money|sniper)\b/.test(lower)) intent = "analytics";

  if (intent === "launch") {
    const draft = extractLaunch(text);
    const symbol = draft.symbol || ticker || "TOKEN";
    const name = draft.name || symbol;
    const prepared = await call("prepare_pons_launch", { name, symbol, description: text });
    return {
      ok: true,
      intent,
      reply: `Prepared a pons v2 launch for ${name} (${symbol}). Connect Phantom on Robinhood Chain (4663) and sign the unsigned transaction. Launch fee is paid in ETH to the pons factory. Apogee does not hold keys. Write pons lowercase — we are not the pons team.`,
      prepared,
      calls,
      history: [...history, { role: "user", content: text }, { role: "assistant", content: "Launch tx prepared." }],
    };
  }

  if (intent === "wallet") {
    if (!address) {
      return {
        ok: true,
        intent,
        reply: "Paste a 0x wallet to track, or connect Phantom on the Wallet page.",
        calls,
      };
    }
    await call("track_wallet", { address });
    return {
      ok: true,
      intent,
      reply: `Tracked ${address} on Robinhood Chain — balances, explorer transfers, and mark-to-market USD.`,
      calls,
    };
  }

  if (intent === "desk") {
    await call("get_desk", {});
    await call("list_trending", { duration: "1h" });
    return { ok: true, intent, reply: "Desk snapshot: trending pools, pons launches, and featured Stock Tokens.", calls };
  }

  if (intent === "connect") {
    await call("get_mcp_info", {});
    return {
      ok: true,
      intent,
      reply: "Canonical MCP is https://apogeemcp.digital/api/mcp — one-click add on /connect for Cursor, Claude, ChatGPT, and Grok. No API key.",
      calls,
    };
  }

  if (intent === "pons") {
    if (address) await call("get_pons_token", { address });
    else await call("list_pons_launches", { limit: 12 });
    return { ok: true, intent, reply: "Live pons index from factory logs (v2 curves + v1 pools).", calls };
  }

  if (intent === "chart") {
    const q = address || ticker || "NVDA";
    await call("get_chart", { query: q });
    return { ok: true, intent, reply: `Candles for ${q} on Robinhood Chain.`, calls };
  }

  if (intent === "quote") {
    const q = ticker || "NVDA";
    await call("get_stock_quote", { symbol: q });
    return { ok: true, intent, reply: `Oracle vs DEX for ${q}.`, calls };
  }

  if (intent === "analytics") {
    const q = address || ticker || "NVDA";
    await call("get_token_analytics", { query: q });
    await call("get_smart_money", { query: q });
    return { ok: true, intent, reply: `Analytics + flow proxy for ${q}.`, calls };
  }

  const q = address || ticker || text;
  await call("scan_token", { query: q });
  return {
    ok: true,
    intent: "scan",
    reply: `Scanned ${q} on Robinhood Chain. Resolve by contract — tickers collide.`,
    calls,
  };
}
