import { afterEach, describe, expect, it } from "vitest";
import {
  mcpHttpUrl,
  publicSiteUrl,
  CANONICAL_MCP,
  CANONICAL_ORIGIN,
  LEGAL,
  PRODUCT,
  TABS,
  MORE_LINKS,
  COMMUNITY,
  PROJECT_CA,
  asset,
  ASSET_V,
} from "../src/lib/site";
import { MCP_INSTRUCTIONS } from "../src/lib/tools";
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

describe("coordinated copy", () => {
  it("keeps product, legal, tabs, and MCP instructions in sync", () => {
    expect(PRODUCT.toolCount).toBe(CATALOG_SIZE);
    expect(PRODUCT.version).toBe("2.0.0");
    expect(PRODUCT.pillars.map((p) => p.name)).toEqual(["Search", "Chart", "Desk", "Launch", "Track"]);
    expect(LEGAL.mcp).toBe(CANONICAL_MCP);
    expect(LEGAL.alias).toBe(`${CANONICAL_ORIGIN}/mcp`);
    expect(LEGAL.updated).toContain("2026");
    expect(LEGAL.affiliation.toLowerCase()).toContain("unaffiliated");
    expect(LEGAL.pons).toMatch(/pons/);
    expect(LEGAL.keys).toMatch(/unsigned/);
    expect(LEGAL.keys.toLowerCase()).not.toContain("all tools are read-only");
    expect(LEGAL.disclaimer.toLowerCase()).toContain("investment advice");
    expect(LEGAL.counsel.toLowerCase()).toContain("counsel");
    expect(LEGAL.stock).toMatch(/United States/);
    expect(TABS.map((t) => t.href)).toEqual(["/", "/dashboard", "/launches", "/orbit", "/wallet"]);
    expect(TABS.map((t) => t.label)).toEqual(["Home", "Desk", "Launch", "Orbit", "Profile"]);
    expect(MORE_LINKS.map((l) => l.href)).toEqual([
      "/developers",
      "/connect",
      "/analytics",
      "/about",
      "/guides",
      "/faq",
      "/whitepaper",
      "/docs",
      "/links",
      "/usage",
      "/privacy",
      "/terms",
    ]);
    expect(asset("/brand/banner.webp")).toBe(`/brand/banner.webp?v=${ASSET_V}`);
    expect(COMMUNITY.telegram).toBe("https://t.me/orbitxwrld");
    expect(COMMUNITY.x).toBe("https://x.com/apogeemcp");
    expect(COMMUNITY.github).toBe("https://github.com/apogeemcp/-");
    expect(PROJECT_CA).toMatch(/^13H4/);
    expect(MCP_INSTRUCTIONS).toContain("3000");
    expect(MCP_INSTRUCTIONS).toContain("unsigned");
    expect(MCP_INSTRUCTIONS).toContain("https://apogeemcp.digital/api/mcp");
  });
});
