const NVIDIA_URL = process.env.NVIDIA_API_BASE || "https://integrate.api.nvidia.com/v1/chat/completions";
const NVIDIA_MODEL = process.env.NVIDIA_MODEL || "meta/llama-3.1-70b-instruct";

export function nvidiaKey(): string | undefined {
  return process.env.NVIDIA_API_KEY || process.env.NVIDIA_NIM_API_KEY || process.env.NGC_API_KEY;
}

export function nvidiaEnabled(): boolean {
  return Boolean(nvidiaKey());
}

export type ChatMsg = {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  name?: string;
  tool_call_id?: string;
  tool_calls?: ToolCall[];
};
export type ToolCall = { id: string; type: "function"; function: { name: string; arguments: string } };

type NimTool = {
  type: "function";
  function: { name: string; description: string; parameters: Record<string, unknown> };
};

export async function nvidiaChat(opts: {
  messages: ChatMsg[];
  tools?: NimTool[];
  stream?: boolean;
}): Promise<{
  content: string;
  tool_calls?: ToolCall[];
}> {
  const key = nvidiaKey();
  if (!key) throw new Error("NVIDIA API key is not configured.");
  const res = await fetch(NVIDIA_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "content-type": "application/json",
      accept: "application/json",
    },
    signal: AbortSignal.timeout(20_000),
    body: JSON.stringify({
      model: NVIDIA_MODEL,
      messages: opts.messages,
      tools: opts.tools,
      tool_choice: opts.tools?.length ? "auto" : undefined,
      temperature: 0.2,
      max_tokens: 1200,
      stream: false,
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`NVIDIA NIM ${res.status}: ${text.slice(0, 280)}`);
  }
  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: string; tool_calls?: ToolCall[] } }>;
  };
  const msg = json.choices?.[0]?.message;
  return { content: String(msg?.content || "").trim(), tool_calls: msg?.tool_calls };
}
