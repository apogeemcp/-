import { CHAIN, ENDPOINTS, TOKENS } from "./chain";
import { RATE_LIMIT } from "./ratelimit";
import { CANONICAL_MCP, CANONICAL_MCP_ALIAS, CANONICAL_ORIGIN, COMMUNITY, HOSTS, LEGAL, PRODUCT, PROJECT_CA } from "./site";
import { TOOLS, type ToolDef } from "./tools";

export const MCP_PROTOCOL = "2025-03-26";
export const SERVER_INFO = { name: "apogee", version: PRODUCT.version };

export const GITHUB_REPO = COMMUNITY.github;
export const DISCLAIMER = LEGAL.disclaimer;

export type SafetyClass = "READ ONLY" | "LOW RISK ACTION" | "FINANCIAL / HIGH IMPACT";

export type ToolCategory =
  | "Token"
  | "Market"
  | "Wallet"
  | "Trading"
  | "Launch"
  | "Analytics"
  | "Utility";

export type DocsNavItem = { href: string; label: string; group: string };

export const DOCS_NAV: DocsNavItem[] = [
  { group: "Start", href: "/developers", label: "Overview" },
  { group: "Start", href: "/developers/quickstart", label: "Quick Start" },
  { group: "Start", href: "/developers/mcp", label: "MCP" },
  { group: "Reference", href: "/developers/tools", label: "Tools" },
  { group: "Reference", href: "/developers/resources", label: "Resources" },
  { group: "Reference", href: "/developers/protocol", label: "API / Protocol" },
  { group: "Reference", href: "/developers/errors", label: "Errors" },
  { group: "Build", href: "/developers/integrate", label: "Integration" },
  { group: "Build", href: "/developers/client", label: "Custom client" },
  { group: "Build", href: "/developers/agent", label: "Build an agent" },
  { group: "Build", href: "/developers/examples", label: "Examples" },
  { group: "Build", href: "/developers/auth", label: "Authentication" },
  { group: "Data", href: "/developers/chains", label: "Supported chains" },
  { group: "Data", href: "/developers/data", label: "Data & caching" },
  { group: "Ops", href: "/developers/security", label: "Security" },
  { group: "Ops", href: "/developers/troubleshooting", label: "Troubleshooting" },
  { group: "Ops", href: "/developers/versioning", label: "Versioning" },
  { group: "Ops", href: "/developers/changelog", label: "Changelog" },
  { group: "Ops", href: "/developers/status", label: "Status" },
];

export const DOCS_GROUPS = [...new Set(DOCS_NAV.map((i) => i.group))];

export function toolSafety(name: string): { class: SafetyClass; note: string } {
  if (name === "prepare_pons_launch") {
    return {
      class: "FINANCIAL / HIGH IMPACT",
      note: "Returns an unsigned pons v2 launchToken transaction. Signing it in a wallet spends the launch fee in ETH. Apogee does not broadcast unless you sign.",
    };
  }
  if (name === "prepare_pons_buy") {
    return {
      class: "FINANCIAL / HIGH IMPACT",
      note: "Indicative buy helper plus the pons app URL. Does not broadcast. Following the URL or signing a later tx can move funds.",
    };
  }
  if (name === "add_robinhood_chain") {
    return {
      class: "LOW RISK ACTION",
      note: "Returns wallet_addEthereumChain parameters. The wallet, not Apogee, adds the network if the user confirms.",
    };
  }
  return {
    class: "READ ONLY",
    note: "Retrieves public chain or market data. Does not sign, broadcast, or move funds.",
  };
}

export function toolCategory(name: string): ToolCategory {
  if (/pons|launch|curve|prepare_pons|preview_pons/.test(name)) return "Launch";
  if (/wallet|pnl|track_wallet/.test(name)) return "Wallet";
  if (/swap|gas|add_robinhood/.test(name)) return "Trading";
  if (/analytic|trader|smart|first_buy|compare|safety|verify|holder/.test(name)) return "Analytics";
  if (/chart|pair|trending|top_pool|boosted|market_overview|desk|stock_quote|corporate|chain_stats/.test(name)) {
    return "Market";
  }
  if (/search|scan|get_token|get_contract|activity|list_stock/.test(name)) return "Token";
  return "Utility";
}

export function toolFreshness(name: string): string {
  if (/list_pons_launches|list_launches/.test(name)) return "On-chain factory logs, cached ~20s in process memory.";
  if (/list_stock_tokens|get_corporate|get_stock_quote/.test(name)) {
    return "RHJ registry cached ~10 minutes; DEX premium is read live from DexScreener.";
  }
  if (/wallet_pnl|get_wallet/.test(name)) return "Balances from public RPC at request time; USD marks from DexScreener.";
  if (/chart/.test(name)) return "GeckoTerminal OHLCV at request time. No local candle cache.";
  if (/desk|trending|boosted|market/.test(name)) return "DexScreener / Gecko / DefiLlama at request time.";
  if (/status|mcp_info|chain_stats|gas/.test(name)) return "Live RPC / provider calls at request time.";
  return "Provider or chain read at request time unless noted. Do not cache indefinitely.";
}

function schemaProps(t: ToolDef): Record<string, { type?: string; description?: string; enum?: string[]; default?: unknown }> {
  return ((t.inputSchema.properties || {}) as Record<
    string,
    { type?: string; description?: string; enum?: string[]; default?: unknown }
  >);
}

function exampleValue(key: string, prop: { description?: string; enum?: string[] }): string {
  if (prop.enum?.[0]) return prop.enum[0];
  if (key === "query" || key === "symbol" || key === "ticker") return "NVDA";
  if (key === "fromToken") return "ETH";
  if (key === "toToken") return "USDG";
  if (key === "amount" || key === "ethAmount") return "0.01";
  if (key.includes("address") || key === "pair" || key === "hash") return "0x…";
  if (key === "name") return "Example";
  if (key === "a") return "NVDA";
  if (key === "b") return "AAPL";
  return prop.description || "…";
}

export type ListedToolDoc = {
  name: string;
  description: string;
  purpose: string;
  category: ToolCategory;
  safety: { class: SafetyClass; note: string };
  inputSchema: Record<string, unknown>;
  required: string[];
  optional: string[];
  outputSchema: string;
  exampleRequest: Record<string, unknown>;
  restExample: string;
  errors: string;
  rateLimits: string;
  permissions: string;
  freshness: string;
};

export function listedToolDocs(): ListedToolDoc[] {
  return TOOLS.map((t) => {
    const props = schemaProps(t);
    const required = (t.inputSchema.required as string[] | undefined) || [];
    const optional = Object.keys(props).filter((k) => !required.includes(k));
    const args: Record<string, unknown> = {};
    for (const key of required) args[key] = exampleValue(key, props[key] || {});
    const safety = toolSafety(t.name);
    return {
      name: t.name,
      description: t.description,
      purpose: t.description,
      category: toolCategory(t.name),
      safety,
      inputSchema: t.inputSchema,
      required,
      optional,
      outputSchema:
        "No JSON Schema output is published. Successful MCP calls return JSON as structuredContent (and a text copy). Failures use { ok: false, error } or MCP isError. Sample numbers are not fabricated here — call the live tool.",
      exampleRequest: {
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: { name: t.name, arguments: args },
      },
      restExample: `${CANONICAL_ORIGIN}/api/v1/${t.name}${
        required[0] ? `?${required[0]}=${encodeURIComponent(String(args[required[0]]))}` : ""
      }`,
      errors:
        safety.class === "READ ONLY"
          ? "Unknown tool → HTTP 404 / Unknown tool. Missing or unresolvable arguments → { ok: false, error }. Upstream provider failures surface as error strings."
          : "Same as read-only tools, plus: signing/broadcast is never performed by the server. A prepared payload is not a confirmed transaction.",
      rateLimits: `${RATE_LIMIT.limit} HTTP requests / ${RATE_LIMIT.windowLabel} / client IP / process.`,
      permissions: "Auth none. Every listed tool is callable without credentials. High-impact helpers still require a local wallet signature to take effect.",
      freshness: toolFreshness(t.name),
    };
  });
}

export const TOOL_CATEGORIES: ToolCategory[] = ["Token", "Market", "Wallet", "Trading", "Launch", "Analytics", "Utility"];

export const SUPPORTED_CHAINS = [
  {
    name: CHAIN.name,
    chainId: CHAIN.id,
    hexId: CHAIN.hexId,
    native: CHAIN.nativeSymbol,
    slug: CHAIN.slug,
    rpc: "https://rpc.mainnet.chain.robinhood.com (override with APOGEE_RPC_URL on the server)",
    explorer: CHAIN.explorer,
    dexScreener: CHAIN.dexScreener,
    gecko: CHAIN.geckoNetwork,
    wrapped: TOKENS.WETH,
    usd: TOKENS.USDG,
    functionality: [
      "Token search and scans",
      "DEX pools (DexScreener slug robinhood — never 4663)",
      "GeckoTerminal OHLCV and pool trades",
      "Wallet balances and mark-to-market",
      "pons v1/v2 launch indexing and unsigned v2 launch prep",
      "RHJ Stock Token registry and oracle vs DEX premium",
    ],
    data: "Public RPC, DexScreener, GeckoTerminal, DefiLlama, RHJ, Blockscout (often Cloudflare-gated from some hosts), on-chain pons factories.",
    tokens: "ERC-20s on 4663, including canonical Stock Tokens from RHJ /assets.",
    wallets: "Any 0x address. Connect uses Phantom (EIP-1193) locally. No custody.",
    analytics: "Dex windows, holder/flow proxies, scan scores. Not a full holder ledger.",
    launches: "pons v1/v2 TokenLaunched logs. Graduation is not a quality signal.",
  },
] as const;

const LEGAL_STOCK_SHORT =
  "Stock Tokens may not be offered, sold, or delivered to persons in the United States, Canada, the United Kingdom, or Switzerland.";

export const DATA_PROVIDERS = [
  {
    name: "Robinhood Chain public RPC",
    url: "https://rpc.mainnet.chain.robinhood.com",
    provides: "Blocks, receipts, eth_call, balances, logs for pons factories.",
    why: "Source of on-chain truth for 4663.",
    realtime: "Request time.",
    cache: "ETH-USD (via DexScreener) cached 60s in pons helpers. No general RPC cache.",
    limits: "Public RPC may rate-limit or time out. Override with APOGEE_RPC_URL server-side.",
  },
  {
    name: "DexScreener",
    url: ENDPOINTS.dex,
    provides: "Pairs, prices, liquidity, volume, trending, boosted tokens. Chain filter: slug robinhood.",
    why: "Market surface for Robinhood Chain pools.",
    realtime: "Near-real-time provider data.",
    cache: "Not cached in Apogee except where a helper stores a short-lived result.",
    limits: "Third-party terms apply. Tickers collide — resolve by contract.",
  },
  {
    name: "GeckoTerminal",
    url: ENDPOINTS.gecko,
    provides: "OHLCV, pool trades, token metadata/images. Network slug robinhood.",
    why: "Candles and prints for token pages and get_chart.",
    realtime: "Provider refresh; not a websocket feed.",
    cache: "None in Apogee.",
    limits: "Pool ids are not token addresses. Base token 0x is used for /token routes.",
  },
  {
    name: "DefiLlama",
    url: ENDPOINTS.llama,
    provides: "Chain TVL used in desk / chain stats.",
    why: "Public TVL figure for Robinhood Chain.",
    realtime: "Provider cadence.",
    cache: "Fetched with chain stats; not a dedicated long TTL.",
    limits: "TVL methodology is DefiLlama's, not Apogee's.",
  },
  {
    name: "RHJ Stock Token APIs",
    url: ENDPOINTS.rhj,
    provides: "Canonical Stock Token registry, multipliers, logos, corporate actions, oracle bid/ask.",
    why: "Distinguish official Stock Tokens from ticker lookalikes.",
    realtime: "Oracle vs DEX premium computed live; registry cached 10 minutes.",
    cache: "10 minutes for /assets.",
    limits: LEGAL_STOCK_SHORT,
  },
  {
    name: "Blockscout explorer",
    url: CHAIN.explorer,
    provides: "Optional tokentx / account history for holders, burns, wallet flow.",
    why: "Transfer history when the API is reachable.",
    realtime: "Indexed explorer data.",
    cache: "None.",
    limits: "Often Cloudflare 403 from some hosts. Apogee then returns empty proxies rather than invented ledgers.",
  },
  {
    name: "pons factories (on-chain)",
    url: "https://www.ponsfamily.com/launchpad",
    provides: "TokenLaunched logs, curve/graduation state, unsigned launch helpers.",
    why: "Launch indexing. Apogee does not operate pons.",
    realtime: "Log lookback (default 8000 blocks), launches cached ~20s.",
    cache: "20 seconds for launch lists.",
    limits: "Unaffiliated. Graduation is not quality. v2 live factory is documented in MCP instructions.",
  },
] as const;

export const FRESHNESS = [
  { category: "Token price / pools", value: "Near-real-time DexScreener at request time." },
  { category: "Token metadata / images", value: "On-chain ERC-20 plus Gecko metadata at request time." },
  { category: "OHLCV", value: "GeckoTerminal candles at request time." },
  { category: "Holders", value: "Transfer/liquidity proxy. Not a full indexed ledger. May be empty if explorer is gated." },
  { category: "Transactions", value: "Public RPC receipts; explorer transfers when reachable." },
  { category: "Analytics / scan scores", value: "Calculated from live Dex + RHJ + on-chain reads." },
  { category: "Stock Token registry", value: "RHJ /assets cached ~10 minutes." },
  { category: "pons launches", value: "Factory logs, list cached ~20 seconds." },
  { category: "ETH-USD (launch helpers)", value: "Cached ~60 seconds." },
] as const;

export const RPC_ERRORS = [
  {
    code: "-32600",
    name: "Invalid request",
    meaning: "JSON-RPC body had no method.",
    cause: "Malformed or empty MCP POST body.",
    action: "Send { jsonrpc: \"2.0\", id, method, params }.",
    retry: "Do not retry the same body.",
  },
  {
    code: "-32601",
    name: "Method not found",
    meaning: "The MCP method is not implemented.",
    cause: "Typo or unsupported method (no prompts, no sampling, no legacy SSE subscribe).",
    action: "Use initialize, ping, tools/list, tools/call, resources/list, resources/read.",
    retry: "Fix the method name; do not hammer.",
  },
] as const;

export const HTTP_ERRORS = [
  {
    code: "202",
    name: "Accepted (notification)",
    meaning: "MCP notification with no JSON-RPC response.",
    cause: "methods starting with notifications/.",
    action: "Expected. Continue with tools/list.",
    retry: "n/a",
  },
  {
    code: "400",
    name: "Empty prompt",
    meaning: "Orbit agent POST had no prompt/message.",
    cause: "/api/agent without a prompt.",
    action: "Send { prompt: \"...\" }.",
    retry: "After fixing the body.",
  },
  {
    code: "404",
    name: "Unknown tool",
    meaning: "REST /api/v1/<tool> or dispatchTool could not resolve the name.",
    cause: "Wrong tool name. Catalog aliases work; random names do not.",
    action: "Call GET /api/v1 or tools/list / search_catalog.",
    retry: "After correcting the name.",
  },
  {
    code: "429",
    name: "RATE_LIMITED",
    meaning: `More than ${RATE_LIMIT.limit} HTTP requests per ${RATE_LIMIT.windowLabel} from this IP on this process.`,
    cause: "Burst of MCP/REST/agent calls.",
    action: "Back off. Honor Retry-After and RateLimit-Reset.",
    retry: "After Retry-After seconds. Exponential backoff for agents.",
  },
  {
    code: "500",
    name: "Upstream / internal",
    meaning: "Health or agent handler threw.",
    cause: "RPC or model failure.",
    action: "Check /developers/status and retry later.",
    retry: "Transient — retry with backoff.",
  },
] as const;

export const TOOL_ERRORS = [
  {
    name: "Unknown tool: <name>",
    meaning: "Name is not a listed tool or catalog alias.",
    action: "search_catalog, then run_tool.",
    retry: "No.",
  },
  {
    name: "Missing tool name",
    meaning: "tools/call or REST POST omitted the name.",
    action: "Pass params.name / body.tool.",
    retry: "No.",
  },
  {
    name: "Provide a 0x wallet / address",
    meaning: "Address failed ADDRESS_RE (0x + 40 hex).",
    action: "Pass a Robinhood Chain 0x address, not a ticker.",
    retry: "No.",
  },
  {
    name: "No Robinhood Chain market found",
    meaning: "DexScreener had no robinhood pair for the query.",
    action: "Resolve by contract. Tickers collide.",
    retry: "Maybe later if a pool appears.",
  },
  {
    name: "Not a pons launch token",
    meaning: "Address is not in indexed v1/v2 TokenLaunched logs.",
    action: "Use list_pons_launches; do not invent launches.",
    retry: "After a real launch is indexed.",
  },
  {
    name: "Need a token name and ticker",
    meaning: "prepare_pons_launch missing name/symbol.",
    action: "Required: name, symbol.",
    retry: "No.",
  },
] as const;

export const CHANGELOG = [
  {
    version: PRODUCT.version,
    date: "2026-09-08",
    added: [
      "Developer portal generated from listed MCP tools.",
      `HTTP rate limit: ${RATE_LIMIT.limit} requests / ${RATE_LIMIT.windowLabel} / IP / process on MCP, REST, and /api/agent.`,
      "Technical whitepaper, data usage, availability, expanded terms and privacy.",
    ],
    changed: ["Site copy stays Apogee (not a rebrand). Orbit remains the in-app assistant."],
    fixed: [],
    deprecated: [],
    removed: [],
    security: [
      "RateLimit-* and Retry-After headers on limited routes.",
      "Security reporting via GitHub — no invented security inbox.",
    ],
  },
  {
    version: "2.0.0",
    date: "2026-09",
    added: [
      "3000-operation catalog (listed tools + aliases such as scan_NVDA).",
      "Orbit assistant using the same dispatch path.",
      "Token terminals, Gecko candles and pool trades, PWA install.",
      "Unsigned pons v2 launch prep for Phantom on chain 4663.",
    ],
    changed: ["Canonical MCP URL https://apogeemcp.digital/api/mcp (alias /mcp)."],
    fixed: ["Token pages use the base-token 0x, not Uniswap v4 pool ids."],
    deprecated: [],
    removed: [],
    security: ["Most tools remain read-only. Launch helpers stay unsigned."],
  },
] as const;

export const VERSIONING = {
  product: PRODUCT.version,
  mcpProtocol: MCP_PROTOCOL,
  serverName: SERVER_INFO.name,
  serverVersion: SERVER_INFO.version,
  transport: "streamable-http",
  auth: "none",
  listedTools: TOOLS.length,
  catalog: PRODUCT.toolCount,
  rest: "/api/v1/<tool>",
  deprecation:
    "Apogee will keep the current Streamable HTTP JSON-RPC POST URL through a documented transition before removing a method or listed tool. Catalog aliases may be added without a breaking bump. Removing a listed tool or changing a required argument is a breaking change and will be noted in the changelog. MCP protocol 2025-03-26 is what this server advertises — it does not claim newer spec revisions until the implementation is upgraded.",
} as const;

export type SearchHit = { title: string; href: string; section: string; text: string };

export function docsSearchIndex(): SearchHit[] {
  const hits: SearchHit[] = DOCS_NAV.map((i) => ({
    title: i.label,
    href: i.href,
    section: i.group,
    text: `${i.label} ${i.group} Apogee MCP developer`,
  }));
  for (const t of listedToolDocs()) {
    hits.push({
      title: t.name,
      href: `/developers/tools#${t.name}`,
      section: t.category,
      text: `${t.name} ${t.description} ${t.safety.class} ${t.required.join(" ")}`,
    });
  }
  const extras: SearchHit[] = [
    { title: "Whitepaper", href: "/whitepaper", section: "Information", text: "architecture MCP data tools AI security privacy chains" },
    { title: "Terms", href: "/terms", section: "Legal", text: "terms of use MCP developer acceptable use liability" },
    { title: "Privacy", href: "/privacy", section: "Legal", text: "privacy logs supabase cookies wallets NVIDIA" },
    { title: "Data usage", href: "/data-usage", section: "Legal", text: "licensing DexScreener Gecko RHJ redistribution" },
    { title: "Availability", href: "/availability", section: "Legal", text: "Stock Token US Canada UK Switzerland regional" },
    { title: "FAQ", href: "/faq", section: "Information", text: "faq mcp pons phantom" },
    { title: "About", href: "/about", section: "Information", text: "what is Apogee Robinhood Chain" },
    { title: "Guides", href: "/guides", section: "Information", text: "desk launch orbit profile" },
    { title: "Connect", href: "/connect", section: "Start", text: "Cursor Claude ChatGPT Grok VS Code install" },
    { title: "Report a security issue", href: "/developers/security#report", section: "Ops", text: "vulnerability disclosure GitHub" },
    { title: "Project contract", href: "/developers#token", section: "Start", text: PROJECT_CA },
    { title: "Community Telegram", href: COMMUNITY.telegram, section: "Community", text: "telegram t.me/orbitxwrld" },
    { title: "Community X", href: COMMUNITY.x, section: "Community", text: "x.com/apogeemcp" },
    { title: "GitHub", href: GITHUB_REPO, section: "Community", text: "github.com/apogeemcp" },
  ];
  return hits.concat(extras);
}

export const MCP_METHODS = [
  { method: "initialize", result: "protocolVersion 2025-03-26, capabilities.tools, serverInfo apogee@2.0.0, instructions" },
  { method: "ping", result: "empty object" },
  { method: "tools/list", result: `listed tools (${TOOLS.length}) with name, description, inputSchema` },
  { method: "tools/call", result: "content[] text JSON + structuredContent; isError on thrown failures" },
  { method: "resources/list", result: "apogee://docs/usage, apogee://mcp" },
  { method: "resources/read", result: "markdown usage or canonical MCP URL" },
] as const;

export const RESOURCES = [
  { uri: "apogee://docs/usage", mime: "text/markdown", meaning: "Same text as MCP_INSTRUCTIONS (usage rules for hosts)." },
  { uri: "apogee://mcp", mime: "text/plain", meaning: CANONICAL_MCP },
] as const;

export { CANONICAL_MCP, CANONICAL_MCP_ALIAS, CANONICAL_ORIGIN, HOSTS, RATE_LIMIT, TOOLS };
