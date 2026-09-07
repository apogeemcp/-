import { TOOLS, MCP_INSTRUCTIONS } from "./tools";
import { toolImpl, type ToolName } from "./intel";

export const MCP_PROTOCOL = "2025-03-26";
export const SERVER_INFO = { name: "apogee", version: "1.1.0" };

type RpcId = string | number | null;
type RpcReq = { jsonrpc?: string; id?: RpcId; method?: string; params?: unknown };

function ok(id: RpcId, result: unknown) {
  return { jsonrpc: "2.0", id: id ?? null, result };
}
function err(id: RpcId, code: number, message: string, data?: unknown) {
  return { jsonrpc: "2.0", id: id ?? null, error: { code, message, ...(data ? { data } : {}) } };
}

function asArgs(params: unknown): Record<string, unknown> {
  if (!params || typeof params !== "object") return {};
  const p = params as { arguments?: unknown; name?: unknown };
  if (p.arguments && typeof p.arguments === "object") return p.arguments as Record<string, unknown>;
  const { name: _n, ...rest } = params as Record<string, unknown>;
  return rest;
}

export async function handleMcpMessage(msg: RpcReq): Promise<unknown | null> {
  const id = (msg.id ?? null) as RpcId;
  const method = msg.method || "";
  if (method.startsWith("notifications/")) return null;

  if (method === "initialize") {
    return ok(id, {
      protocolVersion: MCP_PROTOCOL,
      capabilities: { tools: { listChanged: false }, resources: {} },
      serverInfo: SERVER_INFO,
      instructions: MCP_INSTRUCTIONS,
    });
  }
  if (method === "ping") return ok(id, {});
  if (method === "tools/list") {
    return ok(id, {
      tools: TOOLS.map((t) => ({
        name: t.name,
        description: t.description,
        inputSchema: t.inputSchema,
      })),
    });
  }
  if (method === "resources/list") {
    return ok(id, {
      resources: [
        {
          uri: "apogee://docs/usage",
          name: "Apogee usage",
          mimeType: "text/markdown",
        },
      ],
    });
  }
  if (method === "resources/read") {
    const uri = (msg.params as { uri?: string } | undefined)?.uri;
    return ok(id, {
      contents: [
        {
          uri: uri || "apogee://docs/usage",
          mimeType: "text/markdown",
          text: MCP_INSTRUCTIONS,
        },
      ],
    });
  }
  if (method === "tools/call") {
    const params = (msg.params || {}) as { name?: string; arguments?: Record<string, unknown> };
    const name = params.name as ToolName;
    const impl = toolImpl[name];
    if (!impl) return err(id, -32601, `Unknown tool: ${params.name}`);
    try {
      const result = await impl(asArgs(params));
      return ok(id, {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        structuredContent: result,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return ok(id, {
        content: [{ type: "text", text: JSON.stringify({ ok: false, error: message }) }],
        isError: true,
      });
    }
  }
  if (!method) return err(id, -32600, "Invalid request");
  return err(id, -32601, `Method not found: ${method}`);
}

export async function handleMcpBody(body: unknown): Promise<{ payload: unknown; notification: boolean }> {
  if (Array.isArray(body)) {
    const out: unknown[] = [];
    for (const item of body) {
      const r = await handleMcpMessage(item as RpcReq);
      if (r) out.push(r);
    }
    return { payload: out, notification: out.length === 0 };
  }
  const r = await handleMcpMessage((body || {}) as RpcReq);
  return { payload: r, notification: r == null };
}

export const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-api-key, apikey, content-type, mcp-session-id, mcp-protocol-version",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Expose-Headers": "mcp-session-id, mcp-protocol-version",
};
