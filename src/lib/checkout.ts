import { checkoutBlocker, expiresAtIso, getPlan, quotePlan, type AccessPlan, type PlanQuote } from "./access";
import { parseSolscanInput, paymentTreasury, solscanTxUrl, verifyTreasuryPayment, type PaymentProof } from "./solana-pay";
import { auditEvent, sbInsert, sbRest, supabaseAdmin } from "./supabase-admin";

export type CheckoutResult = {
  ok: boolean;
  state: string;
  reason?: string;
  quote: PlanQuote;
  purchaseId: string | null;
  persisted: boolean;
  treasury?: string;
};

export function lookupPlanOrThrow(planId: unknown): AccessPlan {
  if (typeof planId !== "string" || !planId.trim()) {
    throw Object.assign(new Error("planId is required."), { status: 400 });
  }
  const plan = getPlan(planId.trim());
  if (!plan) throw Object.assign(new Error("Unknown plan."), { status: 400 });
  return plan;
}

export async function createCheckoutQuote(input: {
  planId: unknown;
  wallet: string | null;
}): Promise<CheckoutResult> {
  const plan = lookupPlanOrThrow(input.planId);
  const quote = quotePlan(plan);
  const blocker = checkoutBlocker();
  if (blocker) {
    return { ok: false, state: blocker.state, reason: blocker.reason, quote, purchaseId: null, persisted: false };
  }
  return {
    ok: true,
    state: "awaiting_confirmation",
    reason: "Send SOL or USDC to the treasury, then paste the Solscan transaction link.",
    quote,
    purchaseId: null,
    persisted: false,
    treasury: paymentTreasury(),
  };
}

type PurchaseRow = {
  id: string;
  wallet?: string | null;
  plan_id: string;
  status: string;
  tx_signature?: string | null;
};

export async function submitSolscanPayment(input: {
  planId: unknown;
  solscan: unknown;
  wallet: string | null;
}): Promise<{
  ok: boolean;
  state: string;
  reason: string;
  quote: PlanQuote;
  purchaseId: string | null;
  grantId: string | null;
  proof: PaymentProof | null;
  explorerUrl: string | null;
  access: { plan: string; expiresAt: string | null; lifetime: boolean } | null;
}> {
  const plan = lookupPlanOrThrow(input.planId);
  const quote = quotePlan(plan);
  const blocker = checkoutBlocker();
  if (blocker) {
    return {
      ok: false,
      state: blocker.state,
      reason: blocker.reason,
      quote,
      purchaseId: null,
      grantId: null,
      proof: null,
      explorerUrl: null,
      access: null,
    };
  }
  const parsed = parseSolscanInput(String(input.solscan || ""));
  if (!parsed.ok) {
    throw Object.assign(new Error(parsed.error), { status: 400 });
  }

  let verified: Awaited<ReturnType<typeof verifyTreasuryPayment>>;
  try {
    verified = await verifyTreasuryPayment(parsed.signature);
  } catch (e) {
    return {
      ok: false,
      state: "failed",
      reason: e instanceof Error ? e.message : "Could not reach Solana RPC.",
      quote,
      purchaseId: null,
      grantId: null,
      proof: null,
      explorerUrl: solscanTxUrl(parsed.signature),
      access: null,
    };
  }
  if (!verified.ok) {
    return {
      ok: false,
      state: verified.state,
      reason: verified.error,
      quote,
      purchaseId: null,
      grantId: null,
      proof: null,
      explorerUrl: solscanTxUrl(parsed.signature),
      access: null,
    };
  }

  if (!supabaseAdmin()) {
    throw Object.assign(new Error("Payment was seen on-chain, but access cannot be stored (missing service role)."), {
      status: 503,
    });
  }

  const existing = await sbRest<PurchaseRow[]>(
    `apogee_mcp_purchases?tx_signature=eq.${encodeURIComponent(parsed.signature)}&select=id,wallet,plan_id,status,tx_signature`,
  );
  const prior = existing.data?.[0];
  if (prior?.status === "confirmed") {
    return {
      ok: true,
      state: "purchase_confirmed",
      reason: "This Solscan transaction was already used. Access was not granted a second time.",
      quote,
      purchaseId: prior.id,
      grantId: null,
      proof: verified.proof,
      explorerUrl: verified.proof.explorerUrl,
      access: null,
    };
  }

  const wallet = input.wallet || verified.proof.payer;
  const starts = new Date();
  const expiresAt = expiresAtIso(plan, starts);
  const inserted = await sbInsert<Record<string, unknown>>("apogee_mcp_purchases", {
    wallet,
    plan_id: plan.id,
    plan_label: plan.label,
    kind: plan.kind,
    price_usd: plan.priceUsd,
    burn_usd: quote.burnUsd,
    ops_usd: quote.opsUsd,
    status: "confirmed",
    verification_status: "payment_verified",
    tx_signature: parsed.signature,
    chain: "solana",
    source: "solscan_manual",
    confirmed_at: starts.toISOString(),
  });
  if (!inserted.ok) {
    const dup = await sbRest<PurchaseRow[]>(
      `apogee_mcp_purchases?tx_signature=eq.${encodeURIComponent(parsed.signature)}&select=id,status`,
    );
    if (dup.data?.[0]) {
      return {
        ok: true,
        state: "purchase_confirmed",
        reason: "Already recorded.",
        quote,
        purchaseId: dup.data[0].id,
        grantId: null,
        proof: verified.proof,
        explorerUrl: verified.proof.explorerUrl,
        access: null,
      };
    }
    throw Object.assign(new Error(inserted.error || "Could not store the purchase."), { status: 502 });
  }
  const purchaseId = Array.isArray(inserted.data) ? String((inserted.data[0] as { id?: string })?.id || "") : "";

  const grant = await sbInsert<Record<string, unknown>>("apogee_access_grants", {
    wallet,
    purchase_id: purchaseId || null,
    plan_id: plan.id,
    starts_at: starts.toISOString(),
    expires_at: expiresAt,
    lifetime: plan.kind === "lifetime",
    status: "active",
  });
  const grantId = Array.isArray(grant.data) ? String((grant.data[0] as { id?: string })?.id || "") : null;

  await sbInsert("apogee_burn_records", {
    purchase_id: purchaseId || null,
    wallet,
    allocation_usd: quote.burnUsd,
    status: "pending",
    verified: false,
    chain: "solana",
  });

  await auditEvent("mcp_payment_confirmed", {
    planId: plan.id,
    purchaseId,
    signature: parsed.signature,
    asset: verified.proof.asset,
    amount: verified.proof.amount,
    wallet,
  });

  return {
    ok: true,
    state: "access_activated",
    reason: `Payment verified: ${verified.proof.asset}${
      verified.proof.amount != null ? ` ${verified.proof.amount}` : ""
    } received. Access is active. $ORBITX buy-and-burn will be executed on our side and will not show as Burned until that transaction is recorded.`,
    quote,
    purchaseId: purchaseId || null,
    grantId,
    proof: verified.proof,
    explorerUrl: verified.proof.explorerUrl,
    access: { plan: plan.label, expiresAt, lifetime: plan.kind === "lifetime" },
  };
}

export async function adminActivatePurchase(id: string) {
  const found = await sbRest<Array<Record<string, unknown>>>(
    `apogee_mcp_purchases?id=eq.${encodeURIComponent(id)}&select=*`,
  );
  const row = found.data?.[0];
  if (!row) throw Object.assign(new Error("Purchase not found."), { status: 404 });
  if (row.status === "confirmed") return { ok: true, already: true };
  const plan = getPlan(String(row.plan_id));
  if (!plan) throw Object.assign(new Error("Unknown plan on this purchase."), { status: 400 });
  const starts = new Date();
  await sbRest(`apogee_mcp_purchases?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify({ status: "confirmed", verification_status: "admin_confirmed", confirmed_at: starts.toISOString() }),
  });
  await sbInsert("apogee_access_grants", {
    wallet: row.wallet,
    purchase_id: id,
    plan_id: plan.id,
    starts_at: starts.toISOString(),
    expires_at: expiresAtIso(plan, starts),
    lifetime: plan.kind === "lifetime",
    status: "active",
  });
  await auditEvent("mcp_payment_admin_confirmed", { id });
  return { ok: true, already: false };
}

export async function adminRecordBurn(input: { purchaseId: string; solscan: string }) {
  const parsed = parseSolscanInput(input.solscan);
  if (!parsed.ok) throw Object.assign(new Error(parsed.error), { status: 400 });
  const found = await sbRest<Array<{ id: string }>>(
    `apogee_mcp_purchases?id=eq.${encodeURIComponent(input.purchaseId)}&select=id,burn_usd,wallet`,
  );
  const purchase = found.data?.[0] as { id: string; burn_usd?: number; wallet?: string } | undefined;
  if (!purchase) throw Object.assign(new Error("Purchase not found."), { status: 404 });
  let verifiedOnChain = false;
  try {
    const res = await fetch(process.env.APOGEE_SOLANA_RPC_URL?.trim() || "https://api.mainnet-beta.solana.com", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getTransaction",
        params: [parsed.signature, { encoding: "jsonParsed", maxSupportedTransactionVersion: 0, commitment: "confirmed" }],
      }),
      signal: AbortSignal.timeout(12_000),
    });
    const json = (await res.json()) as { result?: { meta?: { err?: unknown } } | null };
    verifiedOnChain = Boolean(json.result) && !json.result?.meta?.err;
  } catch {
    verifiedOnChain = false;
  }
  if (!verifiedOnChain) {
    throw Object.assign(new Error("Burn transaction was not found on Solana. It will not be marked verified."), {
      status: 400,
    });
  }
  const existing = await sbRest<Array<{ id: string }>>(
    `apogee_burn_records?purchase_id=eq.${encodeURIComponent(input.purchaseId)}&select=id`,
  );
  const patch = {
    burn_tx: parsed.signature,
    status: "verified",
    verified: true,
    verified_at: new Date().toISOString(),
    chain: "solana",
  };
  if (existing.data?.[0]?.id) {
    await sbRest(`apogee_burn_records?id=eq.${existing.data[0].id}`, { method: "PATCH", body: JSON.stringify(patch) });
  } else {
    await sbInsert("apogee_burn_records", {
      purchase_id: input.purchaseId,
      wallet: purchase.wallet,
      allocation_usd: purchase.burn_usd ?? 0,
      ...patch,
    });
  }
  await auditEvent("mcp_burn_recorded", { purchaseId: input.purchaseId, signature: parsed.signature });
  return { ok: true, explorerUrl: solscanTxUrl(parsed.signature) };
}

export async function loadPurchases(wallet: string) {
  if (!supabaseAdmin()) return { ok: false as const, error: "Service role is not configured.", rows: [] as unknown[] };
  const res = await sbRest<unknown[]>(
    `apogee_mcp_purchases?wallet=eq.${encodeURIComponent(wallet)}&select=id,plan_id,plan_label,kind,price_usd,burn_usd,ops_usd,status,verification_status,tx_signature,chain,created_at&order=created_at.desc&limit=50`,
  );
  return { ok: res.ok, error: res.error, rows: res.data || [] };
}

export async function loadGrants(wallet: string) {
  if (!supabaseAdmin()) return { ok: false as const, error: "Service role is not configured.", rows: [] as unknown[] };
  const res = await sbRest<unknown[]>(
    `apogee_access_grants?wallet=eq.${encodeURIComponent(wallet)}&select=id,plan_id,starts_at,expires_at,lifetime,status,purchase_id,created_at&order=created_at.desc&limit=50`,
  );
  return { ok: res.ok, error: res.error, rows: res.data || [] };
}

export async function loadBurns(wallet: string) {
  if (!supabaseAdmin()) return { ok: false as const, error: "Service role is not configured.", rows: [] as unknown[] };
  const res = await sbRest<unknown[]>(
    `apogee_burn_records?wallet=eq.${encodeURIComponent(wallet)}&select=id,purchase_id,allocation_usd,burn_amount,buy_tx,burn_tx,chain,status,verified,verified_at,created_at&order=created_at.desc&limit=50`,
  );
  return { ok: res.ok, error: res.error, rows: res.data || [] };
}
