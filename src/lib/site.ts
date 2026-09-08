import { CHAIN } from "./chain";

export const CANONICAL_ORIGIN = "https://apogeemcp.digital";
export const CANONICAL_MCP = `${CANONICAL_ORIGIN}/api/mcp`;
export const CANONICAL_MCP_ALIAS = `${CANONICAL_ORIGIN}/mcp`;

function vercelHost(): string | undefined {
  const raw =
    process.env.VERCEL_ENV === "production"
      ? process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL
      : process.env.VERCEL_URL || process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (!raw) return undefined;
  return raw.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

function b64json(value: unknown): string {
  const json = JSON.stringify(value);
  if (typeof Buffer !== "undefined") return Buffer.from(json).toString("base64");
  return btoa(json);
}

export function publicSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  if (process.env.VERCEL_ENV === "preview") {
    const host = vercelHost();
    if (host) return `https://${host}`;
  }
  return CANONICAL_ORIGIN;
}

export function supabaseUrl(): string {
  return (process.env.NEXT_PUBLIC_SUPABASE_URL || "https://paxtohwiycuhwmlziwrr.supabase.co").replace(/\/$/, "");
}

export function supabaseAnonKey(): string {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBheHRvaHdpeWN1aHdtbHppd3JyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExMTEzNjMsImV4cCI6MjA5NjY4NzM2M30.HtHcTkUO35c_4WTjufHRHUhAHPDuATw23bqh39D_qkQ"
  );
}

export function mcpHttpUrl(): string {
  if (process.env.NEXT_PUBLIC_MCP_URL) return process.env.NEXT_PUBLIC_MCP_URL;
  return CANONICAL_MCP;
}

export function restApiUrl(): string {
  return `${CANONICAL_ORIGIN}/api/v1`;
}

export function cursorConfig() {
  return {
    mcpServers: {
      apogee: { url: mcpHttpUrl() },
    },
  };
}

export function cursorRemoteSupabase() {
  const headers: Record<string, string> = {};
  const key = supabaseAnonKey();
  if (key) {
    headers.Authorization = `Bearer ${key}`;
    headers.apikey = key;
  }
  return {
    mcpServers: {
      apogee: {
        url: `${supabaseUrl()}/functions/v1/apogee-mcp`,
        ...(Object.keys(headers).length ? { headers } : {}),
      },
    },
  };
}

export function claudeDesktopConfig() {
  return cursorConfig();
}

export function installLinks() {
  const url = mcpHttpUrl();
  const cursorCfg = b64json({ url });
  const vscode = encodeURIComponent(JSON.stringify({ name: "apogee", type: "http", url }));
  return {
    url,
    alias: CANONICAL_MCP_ALIAS,
    cursor: `cursor://anysphere.cursor-deeplink/mcp/install?name=apogee&config=${cursorCfg}`,
    vscode: `vscode:mcp/install?${vscode}`,
    claude: `https://claude.ai/settings/connectors`,
    chatgpt: `https://chatgpt.com/#settings/Connectors`,
    grok: `https://grok.com/manage-connectors`,
    claudeCode: `claude mcp add --transport http apogee ${url}`,
    json: JSON.stringify(cursorConfig(), null, 2),
    toml: `[mcp_servers.apogee]\nurl = "${url}"`,
  };
}

export const HOSTS = [
  { id: "cursor", name: "Cursor", file: ".cursor/mcp.json", hint: "One-click install, or Settings → MCP" },
  { id: "claude", name: "Claude", file: "Connectors", hint: "Settings → Connectors → Add custom connector" },
  { id: "chatgpt", name: "ChatGPT", file: "Apps & Connectors", hint: "Enable Developer Mode, then Add connector" },
  { id: "grok", name: "Grok", file: "Connectors", hint: "grok.com → Connectors → Add custom connector" },
  { id: "claude-code", name: "Claude Code", file: "CLI", hint: "claude mcp add --transport http apogee <url>" },
  { id: "vscode", name: "VS Code", file: ".vscode/mcp.json", hint: "MCP: Add Server" },
  { id: "windsurf", name: "Windsurf", file: "~/.codeium/windsurf/mcp_config.json", hint: "Windsurf MCP settings" },
  { id: "codex", name: "Codex CLI", file: "~/.codex/config.toml", hint: "[mcp_servers.apogee] url = ..." },
] as const;

export const PRODUCT = {
  name: "Apogee",
  tag: "Robinhood Chain intel for agents",
  pillars: ["Search", "Chart", "Desk", "Launch", "Track"] as const,
  chain: CHAIN,
  toolCount: 3000,
};
