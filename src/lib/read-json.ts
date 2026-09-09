/** Parse a fetch body as JSON. Vercel timeouts return plain text like "An error occurred...". */
export async function readResponseJson<T = Record<string, unknown>>(res: Response): Promise<T> {
  const text = await res.text();
  if (!text.trim()) {
    if (!res.ok) throw new Error(statusMessage(res.status));
    return {} as T;
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(plainTextError(text, res.status));
  }
}

export function plainTextError(text: string, status: number): string {
  const compact = text.replace(/\s+/g, " ").trim().slice(0, 180);
  if (/^an error occurr/i.test(compact) || /FUNCTION_INVOCATION_TIMEOUT/i.test(compact)) {
    return status >= 500
      ? "The request timed out. Refresh in a few seconds — the memo may already be on Solana."
      : compact;
  }
  return compact || statusMessage(status);
}

function statusMessage(status: number): string {
  if (status === 504 || status === 524) return "The request timed out.";
  if (status >= 500) return "Server error.";
  if (status === 429) return "Rate limited. Try again shortly.";
  return `HTTP ${status}`;
}
