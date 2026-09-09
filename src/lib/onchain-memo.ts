import { MEMO_PREFIX, MEMO_PROGRAM_ID, NOTE_MAX_CHARS } from "./onchain-config";

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

export function memoUtf8Hex(memo: string): string {
  return Buffer.from(memo, "utf8").toString("hex");
}

export function parseMemoText(memo: string): { ok: true; note: string } | { ok: false; error: string } {
  const value = stripWrapQuotes(String(memo || "").trim());
  if (!value.startsWith(MEMO_PREFIX)) {
    return { ok: false, error: "Not an Apogee on-chain note memo." };
  }
  const note = value.slice(MEMO_PREFIX.length);
  return note ? { ok: true, note } : { ok: false, error: "Memo has no note body." };
}

export type MemoInstructionLike = {
  programId?: { toBase58?: () => string } | string;
  program?: string;
  parsed?: unknown;
  data?: string;
};

/** Pull ORBITX_NOTE text from a parsed Solana tx. Never treat program invoke/success logs as the memo. */
export function extractMemoFromParsedParts(input: {
  instructions?: MemoInstructionLike[] | null;
  logs?: string[] | null;
}): string | null {
  for (const ix of input.instructions || []) {
    if (!isMemoInstruction(ix)) continue;
    const fromParsed = memoFromParsedField(ix.parsed);
    if (fromParsed) return fromParsed;
    const fromData = memoFromIxData(ix.data);
    if (fromData) return fromData;
  }
  return extractMemoFromLogs(input.logs);
}

function isMemoInstruction(ix: MemoInstructionLike): boolean {
  const pid = typeof ix.programId === "string" ? ix.programId : ix.programId?.toBase58?.();
  if (pid === MEMO_PROGRAM_ID) return true;
  if (ix.program === "spl-memo") return true;
  return typeof pid === "string" && pid.startsWith("Memo");
}

function memoFromParsedField(parsed: unknown): string | null {
  if (typeof parsed === "string") return usableMemo(parsed);
  if (!parsed || typeof parsed !== "object") return null;
  const rec = parsed as { info?: { memo?: unknown }; memo?: unknown };
  if (typeof rec.info?.memo === "string") return usableMemo(rec.info.memo);
  if (typeof rec.memo === "string") return usableMemo(rec.memo);
  return null;
}

function memoFromIxData(data: string | undefined): string | null {
  if (!data) return null;
  const direct = usableMemo(data);
  if (direct) return direct;
  try {
    return usableMemo(Buffer.from(data, "base64").toString("utf8"));
  } catch {
    return null;
  }
}

export function extractMemoFromLogs(logs?: string[] | null): string | null {
  if (!logs?.length) return null;
  for (const line of logs) {
    const match = line.match(/^Program log: Memo \(len \d+\): (.*)$/);
    if (match) return usableMemo(match[1]);
  }
  for (const line of logs) {
    const idx = line.indexOf(MEMO_PREFIX);
    if (idx >= 0) return usableMemo(line.slice(idx).replace(/\s*$/, ""));
  }
  return null;
}

function usableMemo(raw: string): string | null {
  const value = stripWrapQuotes(String(raw || "").trim());
  return value.includes(MEMO_PREFIX) ? value.slice(value.indexOf(MEMO_PREFIX)) : null;
}

function stripWrapQuotes(value: string): string {
  return value.replace(/^"+/, "").replace(/"+$/, "");
}

export function previewNote(note: string, max = 160): string {
  const t = note.trim();
  return t.length <= max ? t : `${t.slice(0, max).trimEnd()}…`;
}

export function isIdempotencyKey(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9._:-]{8,128}$/.test(value);
}
