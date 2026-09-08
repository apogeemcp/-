import { CHAIN } from "./chain";

function vercelHost(): string | undefined {
  const raw =
    process.env.VERCEL_ENV === "production"
      ? process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL
      : process.env.VERCEL_URL || process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (!raw) return undefined;
  return raw.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

export function publicSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  const host = vercelHost();
  if (host) return `https://${host}`;
  return "http://localhost:3000";
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
  const fn = `${supabaseUrl()}/functions/v1/apogee-mcp`;
  return fn;
}

export function restApiUrl(): string {
  return `${supabaseUrl()}/functions/v1/apogee-api`;
}

export function cursorConfig() {
  const url = `${publicSiteUrl()}/api/mcp`;
  return {
    mcpServers: {
      apogee: { url },
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
        url: mcpHttpUrl(),
        ...(Object.keys(headers).length ? { headers } : {}),
      },
    },
  };
}

export function claudeDesktopConfig() {
  return cursorConfig();
}

export const HOSTS = [
  { id: "cursor", name: "Cursor", file: ".cursor/mcp.json", hint: "Cursor Settings → MCP → Add new global MCP server" },
  { id: "claude", name: "Claude Desktop", file: "claude_desktop_config.json", hint: "Claude → Settings → Developer" },
  { id: "claude-code", name: "Claude Code", file: ".mcp.json", hint: "claude mcp add --transport http apogee <url>" },
  { id: "chatgpt", name: "ChatGPT", file: "Connectors", hint: "Settings → Connectors → add remote MCP URL" },
  { id: "vscode", name: "VS Code", file: ".vscode/mcp.json", hint: "MCP: Add Server" },
  { id: "windsurf", name: "Windsurf", file: "~/.codeium/windsurf/mcp_config.json", hint: "Windsurf MCP settings" },
  { id: "gemini", name: "Gemini CLI", file: ".gemini/settings.json", hint: "mcpServers.apogee.url" },
  { id: "codex", name: "Codex CLI", file: "~/.codex/config.toml", hint: "[mcp_servers.apogee] url = ..." },
] as const;

export const PRODUCT = {
  name: "Apogee",
  tag: "Robinhood Chain intel for agents",
  pillars: ["Search", "Chart", "Desk", "Launch"] as const,
  chain: CHAIN,
};
