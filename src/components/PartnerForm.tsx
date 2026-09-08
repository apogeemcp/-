"use client";

import { useState } from "react";
import { PARTNER_TYPES, USAGE_BANDS } from "@/lib/access";

export function PartnerForm() {
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
      const res = await fetch("/api/partners", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(String(json.error || json.message || `Request failed (${res.status})`));
        return;
      }
      setDone("Request stored for review. There is no SLA — we may follow up on the contact you gave.");
      form.reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="panel space-y-4 rounded-xl p-5 sm:p-6">
      <input type="text" name="websiteTrap" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
      <div>
        <label htmlFor="partner-company" className="kicker">
          Company / project
        </label>
        <input id="partner-company" name="company" required minLength={2} maxLength={120} className="field mt-2 w-full rounded-xl" />
      </div>
      <div>
        <label htmlFor="partner-website" className="kicker">
          Website (https)
        </label>
        <input id="partner-website" name="website" type="url" placeholder="https://" className="field mt-2 w-full rounded-xl" />
      </div>
      <div>
        <label htmlFor="partner-contact" className="kicker">
          Contact (email, Telegram, or X)
        </label>
        <input id="partner-contact" name="contact" required minLength={3} maxLength={200} className="field mt-2 w-full rounded-xl" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="partner-type" className="kicker">
            Integration type
          </label>
          <select id="partner-type" name="integrationType" className="field mt-2 w-full rounded-xl">
            <option value="">Select…</option>
            {PARTNER_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="partner-usage" className="kicker">
            Expected usage
          </label>
          <select id="partner-usage" name="expectedUsage" className="field mt-2 w-full rounded-xl">
            <option value="">Select…</option>
            {USAGE_BANDS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label htmlFor="partner-tools" className="kicker">
          Requested tools
        </label>
        <input
          id="partner-tools"
          name="requestedTools"
          placeholder="scan_token, get_desk, track_wallet…"
          maxLength={500}
          className="field mt-2 w-full rounded-xl"
        />
      </div>
      <div>
        <label htmlFor="partner-use" className="kicker">
          Use case
        </label>
        <textarea id="partner-use" name="useCase" required minLength={10} maxLength={4000} rows={5} className="field mt-2 w-full rounded-xl" />
      </div>
      <div>
        <label htmlFor="partner-extra" className="kicker">
          Additional information
        </label>
        <textarea id="partner-extra" name="extra" maxLength={2000} rows={3} className="field mt-2 w-full rounded-xl" />
      </div>
      {error ? <p className="text-sm text-flare">{error}</p> : null}
      {done ? <p className="text-sm text-gold">{done}</p> : null}
      <button type="submit" disabled={busy} className="btn-primary">
        {busy ? "Sending…" : "Submit partnership request"}
      </button>
      <p className="text-xs text-ivory/55">
        Stored server-side when Supabase service role is configured. Not a contract. Not MCP access for sale.
      </p>
    </form>
  );
}
