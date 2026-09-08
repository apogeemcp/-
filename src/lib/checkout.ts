import { checkoutBlocker, getPlan, quotePlan, type AccessPlan, type PlanQuote } from "./access";
import { auditEvent, sbInsert, sbRest, supabaseAdmin } from "./supabase-admin";

export type CheckoutResult = {
  ok: boolean;
  state: "unavailable" | "quoted";
  reason: string;
  quote: PlanQuote;
  purchaseId: string | null;
  persisted: boolean;
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
  const reason =
    blocker?.reason ||
    "Checkout cannot complete until payment capture and on-chain verification are implemented.";

  let purchaseId: string | null = null;
  let persisted = false;
  if (supabaseAdmin()) {
    const inserted = await sbInsert<Record<string, unknown>>("apogee_mcp_purchases", {
      wallet: input.wallet,
      plan_id: plan.id,
      plan_label: plan.label,
      kind: plan.kind,
      price_usd: plan.priceUsd,
      burn_usd: quote.burnUsd,
      ops_usd: quote.opsUsd,
      status: "quoted",
      verification_status: "unverified",
      source: "developer_hub",
    });
    if (inserted.ok && Array.isArray(inserted.data) && inserted.data[0] && typeof inserted.data[0] === "object") {
      const row = inserted.data[0] as { id?: string };
      purchaseId = row.id || null;
      persisted = Boolean(purchaseId);
    }
    await auditEvent("mcp_checkout_quoted", {
      planId: plan.id,
      priceUsd: plan.priceUsd,
      burnUsd: quote.burnUsd,
      wallet: input.wallet,
      purchaseId,
      blocked: true,
    });
  }

  return {
    ok: false,
    state: "unavailable",
    reason,
    quote,
    purchaseId,
    persisted,
  };
}

export async function loadPurchases(wallet: string) {
  if (!supabaseAdmin()) return { ok: false as const, error: "Service role is not configured.", rows: [] as unknown[] };
  const res = await sbRest<unknown[]>(
    `apogee_mcp_purchases?wallet=eq.${encodeURIComponent(wallet)}&select=id,plan_id,plan_label,kind,price_usd,burn_usd,ops_usd,status,verification_status,tx_signature,created_at&order=created_at.desc&limit=50`,
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

/** Never activates access. Confirm endpoint must remain a hard fail until a real verifier exists. */
export function rejectUnverifiedConfirm(): { ok: false; state: "unavailable"; reason: string } {
  return {
    ok: false,
    state: "unavailable",
    reason:
      "On-chain payment confirmation is not implemented. A transaction hash submitted by the client is not proof of payment. Access will not be activated.",
  };
}
