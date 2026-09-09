import type { NextRequest } from "next/server";

export function adminSecretConfigured(): boolean {
  return Boolean(process.env.APOGEE_ADMIN_SECRET?.trim());
}

export function adminAuthorized(req: Request | NextRequest): boolean {
  const secret = process.env.APOGEE_ADMIN_SECRET?.trim();
  if (!secret) return false;
  const header = req.headers.get("x-apogee-admin") || "";
  const bearer = req.headers.get("authorization") || "";
  const token = header || (bearer.startsWith("Bearer ") ? bearer.slice(7) : "");
  return token === secret;
}
