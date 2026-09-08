import { describe, expect, it } from "vitest";
import { dispatchTool, httpStatusForToolError, listedMcpTools } from "../src/lib/dispatch";
import { TOOLS } from "../src/lib/tools";
import { toolImpl } from "../src/lib/intel";

describe("dispatch", () => {
  it("refuses nested catalog meta-tools", async () => {
    await expect(dispatchTool("run_tool", { name: "run_tool", arguments: { name: "ping" } })).rejects.toThrow(
      /nest catalog/i,
    );
    await expect(dispatchTool("invoke_catalog", { name: "search_catalog" })).rejects.toThrow(/nest catalog/i);
  });

  it("maps tool errors to HTTP statuses", () => {
    expect(httpStatusForToolError("Unknown tool: foo")).toBe(404);
    expect(httpStatusForToolError("Missing tool name")).toBe(404);
    expect(httpStatusForToolError("Tool nesting too deep")).toBe(400);
    expect(httpStatusForToolError("Need a token name and ticker.")).toBe(400);
    expect(httpStatusForToolError("rpc timeout")).toBe(500);
  });

  it("pages the catalog instead of dumping 3000 rows", async () => {
    const page = (await dispatchTool("list_catalog_page", { offset: 0, limit: 10 })) as {
      total: number;
      tools: unknown[];
    };
    expect(page.total).toBe(3000);
    expect(page.tools).toHaveLength(10);
  });

  it("keeps listed MCP tools wired to an implementation", () => {
    const meta = new Set(["run_tool", "invoke_catalog", "search_catalog", "list_catalog_page"]);
    const impl = toolImpl as Record<string, unknown>;
    for (const t of TOOLS) {
      expect(Boolean(impl[t.name] || meta.has(t.name)), t.name).toBe(true);
    }
    const listed = listedMcpTools();
    expect(listed.catalogSize).toBe(3000);
    expect(listed.listed).toBeGreaterThan(20);
  });
});
