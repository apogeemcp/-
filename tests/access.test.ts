import { describe, expect, it } from "vitest";
import { ACCESS_PLANS, MCP_ACCESS, mcpGatingEnabled } from "../src/lib/access";
import { parsePartnerPayload } from "../src/lib/partners";
import { DOCS_NAV, VERSIONING } from "../src/lib/docs";

describe("MCP access model", () => {
  it("keeps live MCP ungated and lists the published periods only", () => {
    expect(mcpGatingEnabled()).toBe(false);
    expect(MCP_ACCESS.liveAuth).toBe("none");
    expect(MCP_ACCESS.burnVerified).toBe(false);
    expect(VERSIONING.auth).toBe("none");
    expect(ACCESS_PLANS.map((p) => p.label)).toEqual(["24 Hours", "7 Days", "30 Days", "90 Days", "1 Year", "Permanent"]);
    expect(ACCESS_PLANS.every((p) => p.live === false)).toBe(true);
  });

  it("is linked from developer nav", () => {
    expect(DOCS_NAV.some((n) => n.href === "/developers/access")).toBe(true);
    expect(DOCS_NAV.some((n) => n.href === "/developers/partners")).toBe(true);
  });
});

describe("partnership payload", () => {
  it("accepts a complete request", () => {
    const parsed = parsePartnerPayload({
      company: "North Desk",
      website: "https://example.com",
      contact: "devs@example.com",
      useCase: "Embed scan_token into our research bot.",
      integrationType: "AI agent",
      expectedUsage: "Prototype",
    });
    expect(parsed.ok).toBe(true);
  });

  it("rejects honeypots, http websites, and short use cases", () => {
    expect(parsePartnerPayload({ company: "A", contact: "x@y.z", useCase: "too short", websiteTrap: "bot" }).ok).toBe(
      false,
    );
    expect(
      parsePartnerPayload({
        company: "North Desk",
        contact: "devs@example.com",
        useCase: "Embed scan_token into our research bot.",
        website: "http://insecure.example",
      }).ok,
    ).toBe(false);
  });
});
