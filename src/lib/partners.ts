import { PARTNER_TYPES, USAGE_BANDS } from "./access";

export type PartnerPayload = {
  company: string;
  website?: string;
  contact: string;
  useCase: string;
  expectedUsage?: string;
  integrationType?: string;
  requestedTools?: string;
  extra?: string;
  websiteTrap?: string;
};

export function parsePartnerPayload(raw: unknown): { ok: true; value: PartnerPayload } | { ok: false; error: string } {
  if (!raw || typeof raw !== "object") return { ok: false, error: "Invalid request." };
  const b = raw as Record<string, unknown>;
  if (String(b.websiteTrap || b.honeypot || "").trim()) return { ok: false, error: "Rejected." };
  const company = String(b.company || "").trim();
  const contact = String(b.contact || "").trim();
  const useCase = String(b.useCase || b.use_case || "").trim();
  if (company.length < 2 || company.length > 120) return { ok: false, error: "Company / project must be 2–120 characters." };
  if (contact.length < 3 || contact.length > 200) return { ok: false, error: "Contact must be 3–200 characters." };
  if (useCase.length < 10 || useCase.length > 4_000) return { ok: false, error: "Use case must be 10–4000 characters." };
  const website = String(b.website || "").trim();
  if (website) {
    try {
      const u = new URL(website);
      if (u.protocol !== "https:") return { ok: false, error: "Website must be https." };
    } catch {
      return { ok: false, error: "Website is not a valid URL." };
    }
  }
  const integrationType = String(b.integrationType || b.integration_type || "").trim();
  if (integrationType && !(PARTNER_TYPES as readonly string[]).includes(integrationType)) {
    return { ok: false, error: "Unknown integration type." };
  }
  const expectedUsage = String(b.expectedUsage || b.expected_usage || "").trim();
  if (expectedUsage && !(USAGE_BANDS as readonly string[]).includes(expectedUsage)) {
    return { ok: false, error: "Unknown usage band." };
  }
  return {
    ok: true,
    value: {
      company,
      website: website || undefined,
      contact,
      useCase,
      expectedUsage: expectedUsage || undefined,
      integrationType: integrationType || undefined,
      requestedTools: String(b.requestedTools || b.requested_tools || "").trim().slice(0, 500) || undefined,
      extra: String(b.extra || "").trim().slice(0, 2_000) || undefined,
    },
  };
}
