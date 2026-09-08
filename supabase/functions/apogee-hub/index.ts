import { cors, json } from "../_shared/apogee.ts";

const TREASURY = Deno.env.get("APOGEE_TREASURY_ADDRESS") || "8PXzJzumhLi2Kwpid1Xf5bodeEFeKRDbq8rmCU1ycVRF";
const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const SOLANA_RPC = Deno.env.get("APOGEE_SOLANA_RPC_URL") || "https://api.mainnet-beta.solana.com";
const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,88}$/;
const BURN_BPS = 2500;

const PLANS = [
  { id: "day-1", label: "1 Day", kind: "rental", durationHours: 24, priceUsd: 100 },
  { id: "day-3", label: "3 Days", kind: "rental", durationHours: 72, priceUsd: 250 },
  { id: "week-1", label: "1 Week", kind: "rental", durationHours: 168, priceUsd: 500, recommended: true },
  { id: "month-1", label: "1 Month", kind: "rental", durationHours: 720, priceUsd: 2500 },
  { id: "lifetime", label: "Lifetime", kind: "lifetime", durationHours: null, priceUsd: 5000 },
] as const;

function allocate(priceUsd: number) {
  const burnUsd = Math.round(((priceUsd * BURN_BPS) / 10_000) * 100) / 100;
  return { burnUsd, opsUsd: Math.round((priceUsd - burnUsd) * 100) / 100 };
}

function sb() {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return null;
  return { url, key };
}

async function sbRest(path: string, init: RequestInit = {}) {
  const admin = sb();
  if (!admin) throw new Error("Service role missing on this function.");
  const res = await fetch(`${admin.url}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: admin.key,
      Authorization: `Bearer ${admin.key}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(init.headers || {}),
    },
  });
  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) throw new Error(typeof data === "string" ? data.slice(0, 400) : JSON.stringify(data).slice(0, 400));
  return data;
}

async function sbRpc(fn: string, body: Record<string, unknown> = {}) {
  return sbRest(`rpc/${fn}`, { method: "POST", body: JSON.stringify(body) });
}

function cronAuthorized(req: Request, body: Record<string, unknown>) {
  const secret = Deno.env.get("CRON_SECRET");
  if (!secret) return false;
  const given = req.headers.get("x-cron-secret") || String(body.secret || "");
  return Boolean(given) && given === secret;
}

function parseSolscan(raw: string) {
  const value = String(raw || "").trim();
  if (!value) return { ok: false as const, error: "Paste a Solscan transaction link or signature." };
  let signature = value;
  try {
    const url = new URL(value);
    const host = url.hostname.replace(/^www\./, "").toLowerCase();
    if (host !== "solscan.io") return { ok: false as const, error: "Only solscan.io transaction links are accepted." };
    const parts = url.pathname.split("/").filter(Boolean);
    const txIdx = parts.findIndex((p) => p === "tx" || p === "transaction");
    signature = txIdx >= 0 ? parts[txIdx + 1] || "" : "";
  } catch {
    signature = value;
  }
  if (!BASE58.test(signature) || signature.length < 64) {
    return { ok: false as const, error: "That is not a Solana transaction signature." };
  }
  return { ok: true as const, signature };
}

function pubkeyOf(entry: unknown): string | null {
  if (typeof entry === "string") return entry;
  if (entry && typeof entry === "object" && "pubkey" in entry) return String((entry as { pubkey: string }).pubkey);
  return null;
}

async function verifyPayment(signature: string) {
  const res = await fetch(SOLANA_RPC, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "getTransaction",
      params: [signature, { encoding: "jsonParsed", maxSupportedTransactionVersion: 0, commitment: "confirmed" }],
    }),
    signal: AbortSignal.timeout(12_000),
  });
  const json = await res.json();
  if (json.error) throw new Error(String(json.error.message || "Solana RPC error."));
  if (!json.result) {
    return { ok: false as const, state: "transaction_not_found", error: "Transaction not found on Solana yet." };
  }
  const tx = json.result;
  if (tx.meta?.err) return { ok: false as const, state: "failed", error: "That transaction failed on-chain." };
  const keys = [
    ...(tx.transaction?.message?.accountKeys || []).map(pubkeyOf),
    ...(tx.meta?.loadedAddresses?.writable || []).map(pubkeyOf),
    ...(tx.meta?.loadedAddresses?.readonly || []).map(pubkeyOf),
  ].filter((x): x is string => Boolean(x));
  const idx = keys.findIndex((k) => k === TREASURY);
  const payer = keys[0] || null;
  let solIn = 0;
  if (idx >= 0) solIn = (tx.meta?.postBalances?.[idx] ?? 0) - (tx.meta?.preBalances?.[idx] ?? 0);
  const tokenDelta = (rows: Array<{ owner?: string; mint?: string; uiTokenAmount?: { uiAmount?: number } }> | undefined) =>
    (rows || [])
      .filter((b) => b.owner === TREASURY && b.mint === USDC_MINT)
      .reduce((s, b) => s + Number(b.uiTokenAmount?.uiAmount || 0), 0);
  const usdcIn = tokenDelta(tx.meta?.postTokenBalances) - tokenDelta(tx.meta?.preTokenBalances);
  if (solIn <= 0 && usdcIn <= 0) {
    return { ok: false as const, state: "failed", error: `This transaction does not send SOL or USDC to ${TREASURY}.` };
  }
  return {
    ok: true as const,
    proof: {
      signature,
      explorerUrl: `https://solscan.io/tx/${signature}`,
      payer,
      asset: usdcIn > 0 ? "USDC" : "SOL",
      amount: usdcIn > 0 ? usdcIn : solIn / 1_000_000_000,
      treasury: TREASURY,
    },
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const url = new URL(req.url);
  const action = url.searchParams.get("action") || url.pathname.split("/").filter(Boolean).pop() || "";

  if (req.method === "GET" && action === "status") {
    const wallet = String(url.searchParams.get("wallet") || "").trim();
    if (wallet.length < 8) return json({ ok: false, error: "wallet query is required." }, 400);
    try {
      await sbRpc("apogee_expire_grants");
      const grants = await sbRest(
        `apogee_access_grants?wallet=eq.${encodeURIComponent(wallet)}&select=id,plan_id,status,starts_at,expires_at,lifetime&order=created_at.desc&limit=20`,
      );
      return json({ ok: true, wallet, grants });
    } catch (e) {
      return json({ ok: false, error: e instanceof Error ? e.message : String(e) }, 500);
    }
  }

  if (req.method === "GET" && (action === "apogee-hub" || action === "plans" || !action)) {
    return json({
      ok: true,
      name: "apogee-hub",
      treasury: TREASURY,
      assets: ["SOL", "USDC"],
      checkout: "manual_solana",
      auth: "none",
      plans: PLANS.map((p) => ({ plan: p, ...allocate(p.priceUsd) })),
    });
  }

  const body = req.method === "POST" ? ((await req.json().catch(() => ({}))) as Record<string, unknown>) : {};
  const kind = String(body.action || action || "");

  try {
    if (kind === "expire") {
      if (!cronAuthorized(req, body)) return json({ ok: false, error: "Unauthorized." }, 401);
      const expired = await sbRpc("apogee_expire_grants");
      return json({ ok: true, expired });
    }

    if (kind === "partner") {
      const company = String(body.company || "").trim();
      const contact = String(body.contact || "").trim();
      const useCase = String(body.useCase || body.use_case || "").trim();
      if (String(body.websiteTrap || "").trim()) return json({ ok: false, error: "Rejected." }, 400);
      if (company.length < 2 || contact.length < 3 || useCase.length < 10) {
        return json({ ok: false, error: "Company, contact, and use case are required." }, 400);
      }
      await sbRest("apogee_partner_requests", {
        method: "POST",
        body: JSON.stringify({
          company,
          website: String(body.website || "").trim() || null,
          contact,
          use_case: useCase,
          expected_usage: String(body.expectedUsage || "").trim() || null,
          integration_type: String(body.integrationType || "").trim() || null,
          requested_tools: String(body.requestedTools || "").trim() || null,
          extra: String(body.extra || "").trim() || null,
          status: "pending",
        }),
      });
      return json({ ok: true });
    }

    if (kind === "support") {
      const topic = String(body.topic || "other");
      const contact = String(body.contact || "").trim();
      const text = String(body.body || body.message || "").trim();
      if (contact.length < 3 || text.length < 10) return json({ ok: false, error: "Contact and message required." }, 400);
      await sbRest("apogee_support_requests", {
        method: "POST",
        body: JSON.stringify({ topic, contact, body: text, status: "open" }),
      });
      return json({ ok: true });
    }

    if (kind === "confirm") {
      const plan = PLANS.find((p) => p.id === String(body.planId || ""));
      if (!plan) return json({ ok: false, state: "failed", error: "Unknown plan." }, 400);
      const parsed = parseSolscan(String(body.solscan || body.tx || ""));
      if (!parsed.ok) return json({ ok: false, state: "failed", error: parsed.error }, 400);
      const verified = await verifyPayment(parsed.signature);
      if (!verified.ok) return json(verified, verified.state === "transaction_not_found" ? 404 : 400);
      const alloc = allocate(plan.priceUsd);
      const wallet = String(body.wallet || verified.proof.payer || "");
      const starts = new Date();
      const expiresAt =
        plan.kind === "lifetime" || plan.durationHours == null
          ? null
          : new Date(starts.getTime() + plan.durationHours * 3600_000).toISOString();
      const existing = (await sbRest(
        `apogee_mcp_purchases?tx_signature=eq.${encodeURIComponent(parsed.signature)}&select=id,status`,
      )) as Array<{ id: string; status: string }>;
      if (existing?.[0]?.status === "confirmed") {
        return json({
          ok: true,
          state: "purchase_confirmed",
          reason: "This Solscan transaction was already used.",
          purchaseId: existing[0].id,
          explorerUrl: verified.proof.explorerUrl,
        });
      }
      const purchasePayload = {
        wallet,
        plan_id: plan.id,
        plan_label: plan.label,
        kind: plan.kind,
        price_usd: plan.priceUsd,
        burn_usd: alloc.burnUsd,
        ops_usd: alloc.opsUsd,
        status: "confirmed",
        verification_status: "payment_verified",
        tx_signature: parsed.signature,
        chain: "solana",
        source: "solscan_manual",
        confirmed_at: starts.toISOString(),
      };
      let purchaseId = existing?.[0]?.id || null;
      if (purchaseId) {
        await sbRest(`apogee_mcp_purchases?id=eq.${encodeURIComponent(purchaseId)}`, {
          method: "PATCH",
          body: JSON.stringify(purchasePayload),
        });
      } else {
        const inserted = (await sbRest("apogee_mcp_purchases", {
          method: "POST",
          body: JSON.stringify(purchasePayload),
        })) as Array<{ id: string }>;
        purchaseId = inserted?.[0]?.id || null;
      }
      const grants = (await sbRest(
        `apogee_access_grants?purchase_id=eq.${encodeURIComponent(String(purchaseId || ""))}&select=id`,
      )) as Array<{ id: string }>;
      if (!grants?.[0]) {
        await sbRest("apogee_access_grants", {
          method: "POST",
          body: JSON.stringify({
            wallet,
            purchase_id: purchaseId,
            plan_id: plan.id,
            starts_at: starts.toISOString(),
            expires_at: expiresAt,
            lifetime: plan.kind === "lifetime",
            status: "active",
          }),
        });
      }
      const burns = (await sbRest(
        `apogee_burn_records?purchase_id=eq.${encodeURIComponent(String(purchaseId || ""))}&select=id`,
      )) as Array<{ id: string }>;
      if (!burns?.[0]) {
        await sbRest("apogee_burn_records", {
          method: "POST",
          body: JSON.stringify({
            purchase_id: purchaseId,
            wallet,
            allocation_usd: alloc.burnUsd,
            status: "pending",
            verified: false,
            chain: "solana",
          }),
        });
      }
      return json({
        ok: true,
        state: "access_activated",
        purchaseId,
        explorerUrl: verified.proof.explorerUrl,
        proof: verified.proof,
        access: { plan: plan.label, expiresAt, lifetime: plan.kind === "lifetime" },
        reason: "Payment verified. Access is active. Buy-and-burn is executed on our side afterwards.",
      });
    }

    return json({ ok: false, error: "Unknown action. Use plans, partner, support, or confirm." }, 400);
  } catch (e) {
    return json({ ok: false, error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
