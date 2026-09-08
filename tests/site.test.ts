import { afterEach, describe, expect, it } from "vitest";
import { mcpHttpUrl, publicSiteUrl, CANONICAL_MCP, CANONICAL_ORIGIN } from "../src/lib/site";
import { buildCatalog, CATALOG_SIZE, searchCatalog } from "../src/lib/catalog";

const keys = [
  "NEXT_PUBLIC_SITE_URL",
  "NEXT_PUBLIC_MCP_URL",
  "VERCEL_ENV",
  "VERCEL_URL",
  "VERCEL_PROJECT_PRODUCTION_URL",
] as const;

afterEach(() => {
  for (const key of keys) delete process.env[key];
});

describe("canonical MCP", () => {
  it("defaults the site and MCP to apogeemcp.digital", () => {
    expect(publicSiteUrl()).toBe(CANONICAL_ORIGIN);
    expect(mcpHttpUrl()).toBe(CANONICAL_MCP);
  });

  it("keeps MCP on the live domain even on preview hosts", () => {
    process.env.VERCEL_ENV = "preview";
    process.env.VERCEL_URL = "apogeemcpdigital-git-preview.vercel.app";
    expect(publicSiteUrl()).toBe("https://apogeemcpdigital-git-preview.vercel.app");
    expect(mcpHttpUrl()).toBe(CANONICAL_MCP);
  });

  it("uses an explicit site URL", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://apogeemcp.digital/";
    expect(publicSiteUrl()).toBe("https://apogeemcp.digital");
  });
});

describe("catalog", () => {
  it("exposes 3000 unique Robinhood Chain operations", () => {
    const tools = buildCatalog();
    expect(tools).toHaveLength(CATALOG_SIZE);
    expect(new Set(tools.map((t) => t.name)).size).toBe(CATALOG_SIZE);
    expect(searchCatalog("NVDA").some((t) => t.name.includes("NVDA"))).toBe(true);
    expect(searchCatalog("wallet").length).toBeGreaterThan(0);
  });
});
