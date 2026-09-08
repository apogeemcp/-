import { describe, expect, it } from "vitest";
import { handleMcpBody, MAX_BATCH, MCP_PROTOCOL } from "../src/lib/mcp";
import { TOOLS } from "../src/lib/tools";

describe("MCP protocol", () => {
  it("lists the same tools as TOOLS", async () => {
    const { payload } = await handleMcpBody({ jsonrpc: "2.0", id: 1, method: "tools/list" });
    const tools = (payload as { result: { tools: Array<{ name: string }> } }).result.tools;
    expect(tools.map((t) => t.name)).toEqual(TOOLS.map((t) => t.name));
  });

  it("rejects oversized batches without running tools", async () => {
    const body = Array.from({ length: MAX_BATCH + 1 }, (_, i) => ({
      jsonrpc: "2.0",
      id: i,
      method: "ping",
    }));
    const { payload } = await handleMcpBody(body);
    expect(payload).toMatchObject({ error: { code: -32600 } });
    expect(String((payload as { error: { message: string } }).error.message)).toMatch(/Batch too large/);
  });

  it("returns initialize with the published protocol", async () => {
    const { payload } = await handleMcpBody({ jsonrpc: "2.0", id: 7, method: "initialize" });
    expect((payload as { result: { protocolVersion: string } }).result.protocolVersion).toBe(MCP_PROTOCOL);
  });

  it("isolates a bad tool call as isError instead of crashing", async () => {
    const { payload } = await handleMcpBody({
      jsonrpc: "2.0",
      id: 3,
      method: "tools/call",
      params: { name: "this_tool_does_not_exist" },
    });
    expect((payload as { result: { isError?: boolean } }).result.isError).toBe(true);
  });
});
