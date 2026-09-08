import {
  CANONICAL_MCP,
  CANONICAL_MCP_ALIAS,
  CHANGELOG,
  DATA_PROVIDERS,
  FRESHNESS,
  GITHUB_REPO,
  HTTP_ERRORS,
  MCP_METHODS,
  RATE_LIMIT,
  RESOURCES,
  RPC_ERRORS,
  SUPPORTED_CHAINS,
  TOOL_ERRORS,
  VERSIONING,
} from "./docs";
import { CATALOG_SIZE } from "./catalog";
import { HOSTS, LEGAL, PRODUCT, installLinks } from "./site";
import { TOOLS } from "./tools";

export type DocBlock =
  | { type: "p"; text: string }
  | { type: "h2"; id?: string; text: string }
  | { type: "h3"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "code"; lang: string; label?: string; code: string }
  | { type: "note"; text: string }
  | { type: "warn"; text: string }
  | { type: "diagram"; variant: "mcp" | "integrate" | "data" }
  | { type: "test" }
  | { type: "links"; items: { href: string; label: string }[] };

export type DocPage = {
  slug: string;
  title: string;
  kicker: string;
  lede: string;
  body: DocBlock[];
};

function links() {
  return installLinks();
}

export function developerPages(): DocPage[] {
  const ins = links();
  const cursorJson = ins.json;
  const vscodeJson = JSON.stringify(
    { servers: { apogee: { type: "http", url: ins.url } } },
    null,
    2,
  );
  const tsClient = `const MCP = process.env.APOGEE_MCP_URL ?? "${CANONICAL_MCP}";

async function mcp<T>(method: string, params: unknown = {}, id = 1): Promise<T> {
  const res = await fetch(MCP, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id, method, params }),
  });
  if (res.status === 429) throw new Error("RATE_LIMITED");
  const json = await res.json();
  if (json.error) throw new Error(json.error.message);
  return json.result as T;
}

const init = await mcp("initialize");
const { tools } = await mcp<{ tools: Array<{ name: string }> }>("tools/list");
const scan = await mcp("tools/call", {
  name: "scan_token",
  arguments: { query: "NVDA" },
});
console.log(init, tools.length, scan);`;

  const pyClient = `import json, os, urllib.request

MCP = os.environ.get("APOGEE_MCP_URL", "${CANONICAL_MCP}")

def mcp(method, params=None, id=1):
    body = json.dumps({"jsonrpc": "2.0", "id": id, "method": method, "params": params or {}}).encode()
    req = urllib.request.Request(MCP, data=body, headers={"content-type": "application/json"})
    with urllib.request.urlopen(req, timeout=30) as res:
        payload = json.loads(res.read().decode())
    if payload.get("error"):
        raise RuntimeError(payload["error"])
    return payload.get("result")

mcp("initialize")
tools = mcp("tools/list")["tools"]
scan = mcp("tools/call", {"name": "scan_token", "arguments": {"query": "NVDA"}})
print(len(tools), scan["structuredContent"] if isinstance(scan, dict) else scan)`;

  return [
    {
      slug: "quickstart",
      title: "5-minute Quick Start",
      kicker: "Start",
      lede: "Understand Apogee MCP, pick a client, connect with auth none, discover tools, and call scan_token.",
      body: [
        { type: "h2", text: "1 — Understand Apogee MCP" },
        {
          type: "p",
          text: "Apogee is a Streamable HTTP MCP server for Robinhood Chain (EIP-155 4663). The model does not magically know chain data. The server exposes callable tools. Canonical URL: " +
            CANONICAL_MCP +
            " (alias " +
            CANONICAL_MCP_ALIAS +
            "). Authentication: none.",
        },
        { type: "h2", text: "2 — Choose a client" },
        {
          type: "ul",
          items: HOSTS.map((h) => `${h.name} — ${h.file}. ${h.hint}`),
        },
        { type: "note", text: "Apogee does not ship a native SDK. Any host that can POST JSON-RPC to a Streamable HTTP MCP URL can connect." },
        { type: "h2", text: "3 — Configure the connection" },
        { type: "code", lang: "json", label: ".cursor/mcp.json", code: cursorJson },
        { type: "code", lang: "json", label: "VS Code mcp.json", code: vscodeJson },
        { type: "code", lang: "bash", label: "Claude Code", code: ins.claudeCode },
        { type: "code", lang: "toml", label: "Codex CLI", code: ins.toml },
        { type: "h2", text: "4 — Authenticate" },
        { type: "p", text: "There is no API key, OAuth, or bearer requirement on the live server. CORS allows authorization headers for hosts that send them, but Apogee ignores them. Do not paste private keys into MCP config." },
        { type: "h2", text: "5 — Discover tools" },
        {
          type: "code",
          lang: "json",
          label: "tools/list",
          code: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }, null, 2),
        },
        {
          type: "p",
          text: `tools/list returns ${TOOLS.length} listed tools. ${CATALOG_SIZE} catalog operations (including aliases like scan_NVDA) are reached with search_catalog and run_tool.`,
        },
        { type: "h2", text: "6 — Call your first tool" },
        {
          type: "code",
          lang: "json",
          label: "scan_token",
          code: JSON.stringify(
            {
              jsonrpc: "2.0",
              id: 2,
              method: "tools/call",
              params: { name: "scan_token", arguments: { query: "NVDA" } },
            },
            null,
            2,
          ),
        },
        {
          type: "p",
          text: "REST equivalent: GET /api/v1/scan_token?query=NVDA. Responses are live JSON. This page does not invent sample prices.",
        },
        { type: "h2", text: "7 — Build something" },
        { type: "test" },
        {
          type: "links",
          items: [
            { href: "/developers/integrate", label: "Integrate" },
            { href: "/developers/tools", label: "Tools" },
            { href: "/developers/agent", label: "Agent tutorial" },
            { href: "/connect", label: "One-click install" },
          ],
        },
      ],
    },
    {
      slug: "mcp",
      title: "What is Apogee MCP?",
      kicker: "MCP",
      lede: "Model Context Protocol is an open standard. Apogee implements a Streamable HTTP server that exposes Robinhood Chain tools to compatible hosts.",
      body: [
        { type: "h2", text: "MCP (the protocol)" },
        {
          type: "p",
          text: "Model Context Protocol lets AI applications connect to external tools, data, and capabilities. MCP servers expose tools, resources, and (optionally) prompts that compatible hosts can use. MCP itself is a technical protocol. Legal and regulatory obligations depend on the product, the data, the jurisdictions, and how the service is operated — not on the fact that MCP is used.",
        },
        { type: "h2", text: "Apogee (this implementation)" },
        {
          type: "p",
          text: `Server name ${VERSIONING.serverName}, version ${VERSIONING.serverVersion}. Protocol ${VERSIONING.mcpProtocol}. Transport ${VERSIONING.transport}. Auth ${VERSIONING.auth}. The AI model does not magically know Apogee data; it only sees results after the host calls a tool.`,
        },
        { type: "diagram", variant: "mcp" },
        { type: "h2", text: "Transport" },
        {
          type: "p",
          text: "POST JSON-RPC to " +
            CANONICAL_MCP +
            ". GET returns a discovery document. Notifications return HTTP 202. vercel.json rewrites /mcp to /api/mcp. There is no stdio server in this repository and no legacy HTTP+SSE subscribe transport. Do not configure sse as the transport for Apogee.",
        },
        { type: "h2", text: "Methods actually implemented" },
        { type: "ul", items: MCP_METHODS.map((m) => `${m.method} — ${m.result}`) },
        { type: "note", text: "This server advertises protocol 2025-03-26. It does not claim later MCP spec revisions until the code is upgraded." },
      ],
    },
    {
      slug: "resources",
      title: "MCP resources",
      kicker: "Reference",
      lede: "resources/list and resources/read expose two URIs. There is no resource subscription.",
      body: [
        { type: "ul", items: RESOURCES.map((r) => `${r.uri} (${r.mime}) — ${r.meaning}`) },
        {
          type: "code",
          lang: "json",
          label: "resources/read",
          code: JSON.stringify(
            { jsonrpc: "2.0", id: 1, method: "resources/read", params: { uri: "apogee://mcp" } },
            null,
            2,
          ),
        },
      ],
    },
    {
      slug: "protocol",
      title: "API / Protocol",
      kicker: "Reference",
      lede: "JSON-RPC MCP, REST aliases, well-known discovery, and llms.txt — only routes that exist in this app.",
      body: [
        { type: "h2", text: "MCP" },
        { type: "ul", items: [`POST ${CANONICAL_MCP}`, `GET ${CANONICAL_MCP} discovery`, `Alias ${CANONICAL_MCP_ALIAS}`, `GET /.well-known/mcp`, `GET /llms.txt`] },
        { type: "h2", text: "REST" },
        {
          type: "p",
          text: "GET /api/v1 lists listed tool names and catalog size. GET or POST /api/v1/<tool> runs dispatchTool (including catalog aliases). POST /api/v1 with { tool, arguments } does the same. Unknown names return HTTP 404.",
        },
        { type: "h2", text: "Orbit agent" },
        { type: "p", text: "POST /api/agent { prompt } runs the in-app Orbit path (heuristic MCP tools, or NVIDIA NIM if NVIDIA_API_KEY is set on the server). This is the website assistant, not a general public LLM API with SLAs." },
        { type: "h2", text: "Health" },
        { type: "p", text: "GET /api/health returns getChainStats() JSON. Failures are HTTP 500 with { ok: false, error }." },
        { type: "h2", text: "Rate limits" },
        {
          type: "p",
          text: `${RATE_LIMIT.limit} HTTP requests per ${RATE_LIMIT.windowLabel} per client IP per process apply to MCP POST, REST tool calls, and /api/agent. Discovery GET /api/mcp, GET /api/v1, and /api/health are not counted. Headers: RateLimit-Limit, RateLimit-Remaining, RateLimit-Reset, Retry-After on 429. Serverless instances do not share counters. Hosting/WAF may throttle earlier.`,
        },
      ],
    },
    {
      slug: "errors",
      title: "Errors",
      kicker: "Reference",
      lede: "Only statuses and messages this codebase actually returns.",
      body: [
        { type: "h2", text: "JSON-RPC" },
        { type: "ul", items: RPC_ERRORS.map((e) => `${e.code} ${e.name} — ${e.meaning} Cause: ${e.cause} Action: ${e.action}`) },
        { type: "h2", text: "HTTP" },
        { type: "ul", items: HTTP_ERRORS.map((e) => `${e.code} ${e.name} — ${e.meaning} Action: ${e.action} Retry: ${e.retry}`) },
        { type: "h2", text: "Tool payload { ok: false, error }" },
        { type: "ul", items: TOOL_ERRORS.map((e) => `${e.name} — ${e.meaning} ${e.action}`) },
        {
          type: "note",
          text: "MCP tools/call catches throws and returns isError: true with { ok: false, error }. That is still HTTP 200 JSON-RPC ok, not a JSON-RPC error object.",
        },
      ],
    },
    {
      slug: "integrate",
      title: "Integrate Apogee into your app",
      kicker: "Build",
      lede: "Use Apogee as a data and tool layer. Your app owns UX, keys, and any user-facing agent.",
      body: [
        { type: "diagram", variant: "integrate" },
        {
          type: "p",
          text: "Keep Apogee credentials (there are none today) and any future secrets on a server. Never put privileged tokens in browser code. Browser apps should call your backend, which calls MCP or REST.",
        },
        { type: "h2", text: "Possible applications (examples only)" },
        {
          type: "ul",
          items: [
            "Token research and collision checks (scan_token, verify_token)",
            "Market / desk snapshots (get_desk, list_trending)",
            "Portfolio dashboards (track_wallet — mark-to-market, not cost-basis PnL)",
            "Launch monitors (list_pons_launches — indexing, not operating pons)",
            "Discord/Telegram bots that call REST",
            "AI agents that expose Apogee tools to a model",
            "Trading UIs that render Apogee analytics without sending users to this site",
          ],
        },
        {
          type: "warn",
          text: "Do not imply your app can execute swaps or launches unless the user signs. get_swap_quote is indicative. prepare_pons_launch is unsigned. Apogee is not a broker.",
        },
        { type: "h2", text: "Recommended architecture" },
        {
          type: "p",
          text: "Token data → your backend (MCP or /api/v1) → your database if you persist → your frontend. Cache conservatively using the TTLs in Data & caching. Respect RATE_LIMITED.",
        },
      ],
    },
    {
      slug: "client",
      title: "Custom MCP client",
      kicker: "Build",
      lede: "Apogee’s server is JSON-RPC over HTTPS. Use fetch, httpx, or any MCP Streamable HTTP client. This repo does not vendor an official SDK.",
      body: [
        { type: "p", text: "Compatible hosts include Cursor, VS Code, Claude (connectors), ChatGPT (developer connectors), Grok, Claude Code, Windsurf, and Codex CLI as configured on /connect. A custom app should POST to the canonical URL." },
        { type: "h2", text: "TypeScript (tested pattern)" },
        { type: "code", lang: "ts", label: "fetch JSON-RPC", code: tsClient },
        { type: "h2", text: "Python (same protocol)" },
        { type: "code", lang: "python", label: "urllib JSON-RPC", code: pyClient },
        { type: "warn", text: "Never commit secrets. There is no Apogee API key today. If you add your own proxy auth, use environment variables." },
        { type: "test" },
      ],
    },
    {
      slug: "agent",
      title: "Build an AI agent with Apogee",
      kicker: "Build",
      lede: "Walkthrough: create an app, connect MCP, discover tools, call one, pass JSON to a model, handle errors, add safety, log calls.",
      body: [
        { type: "diagram", variant: "integrate" },
        { type: "h2", text: "1. Create the application" },
        { type: "p", text: "Any server-side runtime. Keep MCP calls off the public browser." },
        { type: "h2", text: "2. Install MCP dependencies" },
        { type: "p", text: "Optional: an MCP client library. Required: HTTPS JSON POST. Apogee does not require @modelcontextprotocol/sdk on the server — this Next.js app implements the protocol directly." },
        { type: "h2", text: "3. Connect" },
        { type: "p", text: `URL ${CANONICAL_MCP}. initialize then tools/list.` },
        { type: "h2", text: "4–5. Discover and call" },
        { type: "p", text: "Prefer listed names. For aliases, search_catalog then run_tool. First call: scan_token with query NVDA or a 0x." },
        { type: "h2", text: "6. Pass results to the model" },
        { type: "p", text: "Send structuredContent as a tool result. Instruct the model not to invent prices if a tool fails. Orbit on this site follows that rule." },
        { type: "h2", text: "7. Errors" },
        { type: "p", text: "Honor 429. Treat isError / { ok: false } as data, not as a successful quote." },
        { type: "h2", text: "8. Safety controls" },
        {
          type: "ul",
          items: [
            "Allow-list tools. Do not let a prompt freely call prepare_pons_launch.",
            "Require a human to sign any unsigned tx in a wallet UI.",
            "Validate 0x addresses server-side.",
            "Rate-limit your own users in addition to Apogee’s IP limit.",
            "Log tool name, truncated query, timestamp — not secrets.",
          ],
        },
        { type: "h2", text: "9. Logging" },
        { type: "p", text: "Apogee may write tool name + query to apogee_usage (Supabase, RLS, no public policies). Your app should keep its own audit log." },
      ],
    },
    {
      slug: "examples",
      title: "Example projects",
      kicker: "Build",
      lede: "Illustrative architectures. Apogee does not operate or endorse third-party implementations of these ideas.",
      body: [
        { type: "warn", text: "Examples only. Not official products." },
        { type: "h3", text: "Token research agent" },
        { type: "p", text: "Host calls scan_token, verify_token, get_token_analytics. Display verdict + contract. Never treat scan scores as investment advice." },
        { type: "h3", text: "Market dashboard" },
        { type: "p", text: "Poll get_desk / list_trending on a backend. Cache ~30–60s. Link to /token/{address} using the token 0x, not a v4 pool id." },
        { type: "h3", text: "Wallet intelligence app" },
        { type: "p", text: "track_wallet + get_wallet_txs. Label equity as mark-to-market. Do not invent cost basis." },
        { type: "h3", text: "Discord / Telegram bot" },
        { type: "p", text: "Map a command to GET /api/v1/scan_token. Keep the bot token in env. Do not expose a launch-prep command without a confirmation flow." },
        { type: "h3", text: "AI trading research assistant" },
        { type: "p", text: "Read-only tools only. Distinguish DATA vs ANALYTICS vs MODEL OPINION. No execution." },
        { type: "h3", text: "Token alert system" },
        { type: "p", text: "Your scheduler calls REST. Apogee has no webhook product in this repo." },
        { type: "h3", text: "MCP-powered developer assistant" },
        { type: "p", text: "Point Cursor at the canonical URL as on /connect." },
      ],
    },
    {
      slug: "auth",
      title: "Authentication",
      kicker: "Build",
      lede: "The live Apogee MCP and REST APIs currently use auth: none. There is no API key console, OAuth issuer, or credential revocation UI.",
      body: [
        { type: "p", text: "Clients authenticate by opening HTTPS to the public URL. Discovery documents and GET /api/mcp set auth to \"none\". CORS allows authorization and x-api-key so generic hosts can send headers; the server does not validate them." },
        { type: "p", text: "A $ORBITX rental or permanent burn gate is documented as product intent on /developers/access. It is not implemented. APOGEE_MCP_GATING is off. Do not pay anyone selling Apogee MCP API keys — there are none." },
        { type: "h2", text: "How credentials are created" },
        { type: "p", text: "They are not. There is no create-key flow in this repository." },
        { type: "h2", text: "Lifetime, storage, revocation, scopes" },
        { type: "p", text: "Not applicable to Apogee MCP today. If you wrap Apogee behind your own OAuth, that is your system — document it separately and keep secrets in environment variables." },
        { type: "h2", text: "User vs server authorization" },
        { type: "p", text: "Read tools are public. Financial effect still requires a user to sign in their own wallet (Phantom EIP-1193). Apogee never holds keys." },
        {
          type: "code",
          lang: "js",
          label: "NEVER",
          code: 'const API_KEY = "secret..."; // do not hardcode secrets even if you add your own proxy',
        },
        {
          type: "code",
          lang: "js",
          label: "DO",
          code: "const url = process.env.APOGEE_MCP_URL ?? \"https://apogeemcp.digital/api/mcp\";",
        },
        { type: "note", text: "An optional Supabase Edge Function proxies the canonical MCP and may send the public anon key as a Supabase gateway header. That key is a public anon credential, not an Apogee API secret. NVIDIA_* keys are server-only for Orbit and are not MCP credentials." },
      ],
    },
    {
      slug: "chains",
      title: "Supported chains",
      kicker: "Data",
      lede: `Apogee currently supports ${SUPPORTED_CHAINS.map((c) => `${c.name} (chain id ${c.chainId}, slug ${c.slug})`).join(", ")}.`,
      body: [
        {
          type: "p",
          text: "Do not assume a chain is supported because DexScreener or Gecko list it. Apogee filters markets to slug robinhood and EIP-155 4663.",
        },
        ...SUPPORTED_CHAINS.flatMap((c): DocBlock[] => [
          { type: "h2", text: c.name },
          {
            type: "ul",
            items: [
              `Chain ID: ${c.chainId} (${c.hexId})`,
              `Native asset: ${c.native}`,
              `Dex / Gecko slug: ${c.slug} — never ${c.chainId}`,
              `Explorer: ${c.explorer}`,
              `WETH ${c.wrapped}`,
              `USDG ${c.usd}`,
              `Functionality: ${c.functionality.join("; ")}`,
              `Data: ${c.data}`,
              `Tokens: ${c.tokens}`,
              `Wallets: ${c.wallets}`,
              `Analytics: ${c.analytics}`,
              `Launches: ${c.launches}`,
            ],
          },
        ]),
        { type: "warn", text: "The project contract displayed on the site is a public address string. This documentation does not invent an explorer URL for it because the chain is not labeled in-repo." },
      ],
    },
    {
      slug: "data",
      title: "Data, caching, and freshness",
      kicker: "Data",
      lede: "Where numbers come from, what is cached, and what stays empty when a provider is gated.",
      body: [
        { type: "diagram", variant: "data" },
        { type: "h2", text: "Providers actually used" },
        ...DATA_PROVIDERS.flatMap((p): DocBlock[] => [
          { type: "h3", text: p.name },
          {
            type: "ul",
            items: [
              `Provides: ${p.provides}`,
              `Why: ${p.why}`,
              `Freshness: ${p.realtime}`,
              `Cache: ${p.cache}`,
              `Limits: ${p.limits}`,
            ],
          },
        ]),
        { type: "h2", text: "Freshness by category" },
        { type: "ul", items: FRESHNESS.map((f) => `${f.category}: ${f.value}`) },
        { type: "h2", text: "Client caching" },
        {
          type: "p",
          text: "Do not cache prices indefinitely. Desk-style snapshots: 20–60s. Stock registry: up to 10 minutes. Launch lists: ~20s. If a tool returns ok: false or an empty holders/burns list, show empty — do not fill with guesses. This server does not emit MCP cache-control metadata on list responses.",
        },
        { type: "h2", text: "Optional AI" },
        { type: "p", text: "Orbit uses NVIDIA NIM only when NVIDIA_API_KEY, NVIDIA_NIM_API_KEY, or NGC_API_KEY is set on the server (default model meta/llama-3.1-70b-instruct, stream false, 20s timeout). Without a key, Orbit still calls MCP tools heuristically. NVIDIA is not a data indexer." },
      ],
    },
    {
      slug: "security",
      title: "Security",
      kicker: "Ops",
      lede: "MCP is not a security control. Treat tool access, signing, and prompt injection as engineering problems.",
      body: [
        { type: "p", text: LEGAL.disclaimer },
        { type: "h2", text: "Authentication and authorization" },
        { type: "p", text: "MCP is public (auth none). Authorization for value-moving actions is the user’s wallet confirmation, not the LLM. Server-side, dispatchTool does not check a user id." },
        { type: "h2", text: "API keys and secrets" },
        {
          type: "ul",
          items: [
            "Do not put NVIDIA_* or SUPABASE_SERVICE_ROLE_KEY in client bundles.",
            "The Supabase anon key in the frontend is a public anon credential for limited reads.",
            "Never paste seed phrases into Orbit, MCP, or docs.",
          ],
        },
        { type: "h2", text: "Rate limiting" },
        { type: "p", text: `${RATE_LIMIT.limit} req / ${RATE_LIMIT.windowLabel} / IP / process on MCP POST, REST tools, and /api/agent.` },
        { type: "h2", text: "Input and output" },
        { type: "p", text: "Addresses must match 0x + 40 hex. Tool outputs are untrusted JSON from chain/providers — render as data, not as HTML. Do not execute model-generated transactions without a wallet UI." },
        { type: "h2", text: "Prompt injection and tool abuse" },
        {
          type: "ul",
          items: [
            "Allow-list tools in your agent. High-impact: prepare_pons_launch, prepare_pons_buy.",
            "Require explicit user confirmation before showing an unsigned tx for signature.",
            "Do not let a webpage instruct the model to ignore safety rules.",
            "Validate arguments server-side even if the model produced them.",
            "Log suspicious bursts; 429 is not a complete abuse program.",
            "Never rely solely on the LLM to decide whether an action is safe.",
          ],
        },
        { type: "h2", text: "SSRF and request forgery" },
        { type: "p", text: "Tools query fixed providers and user-supplied 0x addresses/tickers, not arbitrary URLs. Do not add a generic fetch tool that takes a URL from the model." },
        { type: "h2", text: "Logging and audit" },
        { type: "p", text: "apogee_usage may store tool, truncated query, ok, timestamp via service role. RLS: no public policies. Do not log unsigned tx payloads to public channels." },
        { type: "h2", text: "Supabase RLS" },
        { type: "p", text: "Usage and scan tables are written with the service role. There is no end-user auth table. If you fork the schema, keep RLS enabled and never expose service role to the browser." },
        { type: "h2", text: "Financial vs data" },
        {
          type: "ul",
          items: [
            "DATA: RPC, Dex, Gecko, RHJ, explorer.",
            "ANALYTICS: scan scores, premiums, mark-to-market.",
            "OPINION / AI: Orbit text. May be wrong.",
            "ACTION: only after the user signs. Apogee does not broadcast unsigned payloads.",
          ],
        },
        { type: "h2", id: "report", text: "Report a security issue" },
        {
          type: "p",
          text: "A security issue is unauthorized access, injection, secret leakage, or a way to make Apogee broadcast or drain funds without user signature. Include product area, impact, and steps that do not include a public exploit dump.",
        },
        {
          type: "p",
          text: `There is no dedicated security email in this repository. Use GitHub on ${GITHUB_REPO} (private vulnerability report if the repo enables it). Do not post exploit PoCs in Telegram, X, or public issues. Public chat is not a disclosure channel.`,
        },
        { type: "note", text: "Responsible disclosure: give maintainers time to patch before publishing. We do not currently publish a paid bug bounty in this codebase." },
      ],
    },
    {
      slug: "troubleshooting",
      title: "Troubleshooting",
      kicker: "Ops",
      lede: "Connection, tools, stale data, auth confusion, and timeouts — mapped to this implementation.",
      body: [
        { type: "h2", text: "MCP will not connect" },
        { type: "ul", items: [`Endpoint must be ${CANONICAL_MCP} or this origin’s /api/mcp.`, "Auth none — do not require OAuth in the client.", "Transport HTTP / streamable HTTP, not stdio, not SSE.", "Open GET /api/mcp — expect JSON with transport streamable-http.", "Check /developers/status and hosting outages."] },
        { type: "h2", text: "Tool unavailable" },
        { type: "ul", items: ["Exact listed name, or a catalog alias via run_tool.", "Unknown tool → 404 / error string.", "429 → wait Retry-After.", "tools/list is the listed set, not all 3000 names."] },
        { type: "h2", text: "Data appears stale" },
        { type: "ul", items: ["RHJ registry up to 10 minutes.", "pons lists ~20s.", "Explorer holders empty when Blockscout is 403.", "Wrong slug: use robinhood, not 4663, on Dex/Gecko.", "Tickers collide — pass a contract."] },
        { type: "h2", text: "Authentication error" },
        { type: "p", text: "Apogee does not issue tokens. If your host demands OAuth, configure it as a custom connector with no auth, or use a client that supports unauthenticated HTTP MCP." },
        { type: "h2", text: "Timeout" },
        { type: "p", text: "Public RPC, Dex, and Gecko can be slow. NVIDIA NIM (Orbit) uses a 20s timeout. Retry with backoff; reduce lookback on list_pons_launches." },
        { type: "test" },
      ],
    },
    {
      slug: "versioning",
      title: "Versioning",
      kicker: "Ops",
      lede: "Product, protocol, and catalog versions as implemented.",
      body: [
        {
          type: "ul",
          items: [
            `Apogee product / MCP server: ${VERSIONING.product}`,
            `MCP protocol advertised: ${VERSIONING.mcpProtocol}`,
            `Transport: ${VERSIONING.transport}`,
            `Listed tools: ${VERSIONING.listedTools}`,
            `Catalog operations: ${VERSIONING.catalog}`,
            `REST: ${VERSIONING.rest}`,
          ],
        },
        { type: "p", text: VERSIONING.deprecation },
        { type: "p", text: "Tool versions are not independently versioned; they ship with the server. Breaking changes (removed listed tool, new required argument) will appear in the changelog." },
      ],
    },
    {
      slug: "changelog",
      title: "Changelog",
      kicker: "Ops",
      lede: "Developer-facing changes. Categories: Added, Changed, Fixed, Deprecated, Removed, Security.",
      body: CHANGELOG.flatMap((e): DocBlock[] => [
        { type: "h2", text: `${e.version} · ${e.date}` },
        ...(e.added.length ? ([{ type: "h3", text: "Added" }, { type: "ul", items: [...e.added] }] as DocBlock[]) : []),
        ...(e.changed.length ? ([{ type: "h3", text: "Changed" }, { type: "ul", items: [...e.changed] }] as DocBlock[]) : []),
        ...(e.fixed.length ? ([{ type: "h3", text: "Fixed" }, { type: "ul", items: [...e.fixed] }] as DocBlock[]) : []),
        ...(e.deprecated.length ? ([{ type: "h3", text: "Deprecated" }, { type: "ul", items: [...e.deprecated] }] as DocBlock[]) : []),
        ...(e.removed.length ? ([{ type: "h3", text: "Removed" }, { type: "ul", items: [...e.removed] }] as DocBlock[]) : []),
        ...(e.security.length ? ([{ type: "h3", text: "Security" }, { type: "ul", items: [...e.security] }] as DocBlock[]) : []),
      ]),
    },
  ];
}

export function developerPage(slug: string): DocPage | undefined {
  return developerPages().find((p) => p.slug === slug);
}

export function developerSlugs(): string[] {
  return developerPages().map((p) => p.slug);
}
