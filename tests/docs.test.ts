import { describe, expect, it } from "vitest";
import { TOOLS } from "../src/lib/tools";
import {
  listedToolDocs,
  toolSafety,
  SUPPORTED_CHAINS,
  DOCS_NAV,
  docsSearchIndex,
  VERSIONING,
} from "../src/lib/docs";
import { developerSlugs, developerPage } from "../src/lib/docs-articles";
import { consumeRateLimit, RATE_LIMIT } from "../src/lib/ratelimit";
import { COMMUNITY, LEGAL, FOOTER } from "../src/lib/site";

describe("developer portal", () => {
  it("generates one doc per listed MCP tool", () => {
    const docs = listedToolDocs();
    expect(docs).toHaveLength(TOOLS.length);
    expect(docs.map((d) => d.name)).toEqual(TOOLS.map((t) => t.name));
    expect(docs.every((d) => d.inputSchema)).toBe(true);
  });

  it("classifies launch helpers as high impact and scans as read-only", () => {
    expect(toolSafety("prepare_pons_launch").class).toBe("FINANCIAL / HIGH IMPACT");
    expect(toolSafety("prepare_pons_buy").class).toBe("FINANCIAL / HIGH IMPACT");
    expect(toolSafety("add_robinhood_chain").class).toBe("LOW RISK ACTION");
    expect(toolSafety("scan_token").class).toBe("READ ONLY");
    expect(toolSafety("get_swap_quote").class).toBe("READ ONLY");
  });

  it("documents only Robinhood Chain 4663", () => {
    expect(SUPPORTED_CHAINS).toHaveLength(1);
    expect(SUPPORTED_CHAINS[0].chainId).toBe(4663);
    expect(SUPPORTED_CHAINS[0].slug).toBe("robinhood");
  });

  it("keeps nav, search, and article slugs aligned", () => {
    const articleHrefs = developerSlugs().map((s) => `/developers/${s}`);
    for (const href of articleHrefs) {
      expect(DOCS_NAV.some((n) => n.href === href)).toBe(true);
      const slug = href.split("/").pop()!;
      expect(developerPage(slug)?.body.length).toBeGreaterThan(0);
    }
    expect(docsSearchIndex().some((h) => h.href === "/developers/tools")).toBe(true);
    expect(docsSearchIndex().some((h) => h.title === "scan_token")).toBe(true);
    expect(VERSIONING.auth).toBe("none");
    expect(VERSIONING.mcpProtocol).toBe("2025-03-26");
    expect(VERSIONING.listedTools).toBe(TOOLS.length);
  });

  it("exposes GitHub and legal disclaimer without inventing a security inbox", () => {
    expect(COMMUNITY.github).toBe("https://github.com/apogeemcp/-");
    expect(LEGAL.disclaimer.toLowerCase()).toContain("financial");
    expect(LEGAL.counsel.toLowerCase()).toContain("not legal advice");
    expect(FOOTER.legal.map((l) => l.href)).toEqual([
      "/terms",
      "/developer-terms",
      "/privacy",
      "/data-usage",
      "/availability",
    ]);
  });
});

describe("rate limit", () => {
  it("allows up to the published limit then 429", () => {
    const ip = `test-${Math.random()}`;
    for (let i = 0; i < RATE_LIMIT.limit; i++) {
      expect(consumeRateLimit(ip).ok).toBe(true);
    }
    expect(consumeRateLimit(ip).ok).toBe(false);
  });
});
