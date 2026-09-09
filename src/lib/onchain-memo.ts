import { MEMO_PREFIX, NOTE_MAX_CHARS } from "./onchain-config";

const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

export function sanitizeNote(raw: unknown): { ok: true; note: string } | { ok: false; error: string } {
  if (typeof raw !== "string") return { ok: false, error: "Note must be text." };
  const note = raw.replace(CONTROL, "").normalize("NFC").trim();
  if (!note) return { ok: false, error: "Note cannot be empty." };
  if (Buffer.byteLength(note, "utf8") !== note.length && !isUtf8(note)) {
    return { ok: false, error: "Note must be valid UTF-8." };
  }
  if (note.length > NOTE_MAX_CHARS) {
    return { ok: false, error: `Note must be ${NOTE_MAX_CHARS} characters or fewer.` };
  }
  if (/https?:\/\/\S+/i.test(note) && note.length < 8) {
    return { ok: false, error: "Note rejected." };
  }
  return { ok: true, note };
}

function isUtf8(value: string): boolean {
  try {
    const encoded = new TextEncoder().encode(value);
    return new TextDecoder("utf-8", { fatal: true }).decode(encoded) === value;
  } catch {
    return false;
  }
}

export function buildMemoText(note: string): string {
  return `${MEMO_PREFIX}${note}`;
}

export function parseMemoText(memo: string): { ok: true; note: string } | { ok: false; error: string } {
  const value = String(memo || "");
  if (!value.startsWith(MEMO_PREFIX)) {
    return { ok: false, error: "Not an Apogee on-chain note memo." };
  }
  const note = value.slice(MEMO_PREFIX.length);
  return note ? { ok: true, note } : { ok: false, error: "Memo has no note body." };
}

export function previewNote(note: string, max = 160): string {
  const t = note.trim();
  return t.length <= max ? t : `${t.slice(0, max).trimEnd()}…`;
}

export function isIdempotencyKey(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9._:-]{8,128}$/.test(value);
}
