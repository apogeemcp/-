"use client";

import { useState } from "react";
import Link from "next/link";
import { CANONICAL_MCP, COMMUNITY } from "@/lib/site";
import { GITHUB_REPO } from "@/lib/docs";

const TOPICS = [
  { id: "docs", label: "Documentation" },
  { id: "mcp", label: "MCP connection" },
  { id: "access", label: "Access / billing" },
  { id: "security", label: "Security report" },
  { id: "partnership", label: "Partnership" },
  { id: "other", label: "Other" },
];

export function SupportDesk() {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setDone(null);
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    try {
      const res = await fetch("/api/support", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `Failed (${res.status})`);
      setDone("Stored for review. There is no SLA. For vulnerabilities prefer a GitHub advisory.");
      form.reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-8">
      <ul className="grid gap-3 sm:grid-cols-2">
        <li className="panel rounded-xl p-4">
          <p className="kicker">Documentation</p>
          <Link href="/developers/troubleshooting" className="mt-2 block text-sm text-ember hover:text-ivory">
            Troubleshooting
          </Link>
          <Link href="/developers/errors" className="mt-1 block text-sm text-ember hover:text-ivory">
            MCP errors
          </Link>
        </li>
        <li className="panel rounded-xl p-4">
          <p className="kicker">MCP status</p>
          <Link href="/developers/status" className="mt-2 block text-sm text-ember hover:text-ivory">
            Live status board
          </Link>
          <p className="mt-1 font-mono text-xs text-ivory/60">{CANONICAL_MCP}</p>
        </li>
        <li className="panel rounded-xl p-4">
          <p className="kicker">Security reporting</p>
          <p className="mt-2 text-sm text-ivory/75">There is no published security@ inbox. Use GitHub.</p>
          <a href={GITHUB_REPO} className="mt-2 inline-block text-sm text-ember" target="_blank" rel="noreferrer">
            {GITHUB_REPO.replace("https://", "")}
          </a>
        </li>
        <li className="panel rounded-xl p-4">
          <p className="kicker">Partnership contact</p>
          <Link href="/developers/partners" className="mt-2 block text-sm text-ember hover:text-ivory">
            Partnership form
          </Link>
          <a href={COMMUNITY.telegram} className="mt-1 block text-sm text-ember" target="_blank" rel="noreferrer">
            Telegram
          </a>
        </li>
      </ul>

      <form onSubmit={onSubmit} className="panel space-y-4 rounded-xl p-5">
        <input type="text" name="websiteTrap" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
        <div>
          <label htmlFor="sup-topic" className="kicker">
            Topic
          </label>
          <select id="sup-topic" name="topic" className="field mt-2 w-full rounded-xl" defaultValue="docs">
            {TOPICS.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="sup-contact" className="kicker">
            Contact
          </label>
          <input id="sup-contact" name="contact" required minLength={3} maxLength={200} className="field mt-2 w-full rounded-xl" />
        </div>
        <div>
          <label htmlFor="sup-body" className="kicker">
            What happened
          </label>
          <textarea id="sup-body" name="body" required minLength={10} maxLength={4000} rows={6} className="field mt-2 w-full rounded-xl" />
        </div>
        {error ? <p className="text-sm text-flare">{error}</p> : null}
        {done ? <p className="text-sm text-gold">{done}</p> : null}
        <button type="submit" disabled={busy} className="btn-primary">
          {busy ? "Sending…" : "Submit"}
        </button>
      </form>
    </div>
  );
}
