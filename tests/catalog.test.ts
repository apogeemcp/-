import { describe, expect, it } from "vitest";
import { dispatchTool } from "../src/lib/dispatch";

describe("dispatch", () => {
  it("resolves catalog aliases to real implementations", async () => {
    const page = await dispatchTool("list_catalog_page", { offset: 0, limit: 5 });
    expect(page).toMatchObject({ ok: true, total: 3000 });
    const search = (await dispatchTool("search_catalog", { query: "wallet" })) as { matches: unknown[] };
    expect(search.matches.length).toBeGreaterThan(0);
  });
});
