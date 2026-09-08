import { TOOLS, MCP_INSTRUCTIONS } from "./tools";
import { dispatchTool } from "./dispatch";

export const MCP_PROTOCOL = "2025-03-26";
export const SERVER_INFO = { name: "apogee", version: "2.0.0" };

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
        {
          uri: "apogee://mcp",
          name: "Canonical MCP URL",
          mimeType: "text/plain",
        },
      ],
    });
  }
  if (method === "resources/read") {
    const uri = (msg.params as { uri?: string } | undefined)?.uri;
    const text =
      uri === "apogee://mcp" ? "https://apogeemcp.digital/api/mcp" : MCP_INSTRUCTIONS;
    return ok(id, {
      contents: [
        {
          uri: uri || "apogee://docs/usage",
          mimeType: uri === "apogee://mcp" ? "text/plain" : "text/markdown",
          text,
        },
      ],
    });
  }
  if (method === "tools/call") {
    const params = (msg.params || {}) as { name?: string; arguments?: Record<string, unknown> };
    try {
      const result = await dispatchTool(String(params.name || ""), asArgs(params));
      return toolPayload(id, result);
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

export const MAX_BATCH = 20;
const MAX_TOOL_JSON = 180_000;

function toolPayload(id: RpcId, result: unknown) {
  let text: string;
  try {
    text = JSON.stringify(result, null, 2);
  } catch {
    text = JSON.stringify({ ok: false, error: "Result could not be serialized" });
  }
  if (text.length > MAX_TOOL_JSON) {
    text = `${text.slice(0, MAX_TOOL_JSON)}\n…truncated`;
  }
  return ok(id, {
    content: [{ type: "text", text }],
    structuredContent: result,
  });
}

export async function handleMcpBody(body: unknown): Promise<{ payload: unknown; notification: boolean }> {
  if (Array.isArray(body)) {
    if (body.length > MAX_BATCH) {
      return { payload: err(null, -32600, `Batch too large (max ${MAX_BATCH})`), notification: false };
    }
    const out: unknown[] = [];
    for (const item of body) {
      try {
        const r = await handleMcpMessage(item as RpcReq);
        if (r) out.push(r);
      } catch (error) {
        const id = item && typeof item === "object" && "id" in item ? ((item as RpcReq).id ?? null) : null;
        const message = error instanceof Error ? error.message : String(error);
        out.push(err(id as RpcId, -32603, message));
      }
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
  "Access-Control-Expose-Headers":
    "mcp-session-id, mcp-protocol-version, RateLimit-Limit, RateLimit-Remaining, RateLimit-Reset, Retry-After",
};
