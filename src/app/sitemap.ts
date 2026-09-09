import type { MetadataRoute } from "next";
import { publicSiteUrl } from "@/lib/site";
import { developerSlugs } from "@/lib/docs-articles";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = publicSiteUrl();
  const extra = developerSlugs().map((s) => `/developers/${s}`);
  const paths = [
    "",
    "/onchain-notes",
    "/dashboard",
    "/launches",
    "/docs",
    "/connect",
    "/orbit",
    "/wallet",
    "/analytics",
    "/about",
    "/guides",
    "/faq",
    "/links",
    "/privacy",
    "/terms",
    "/usage",
    "/developers",
    "/developers/tools",
    "/developers/status",
    "/developers/onchain",
    "/developers/access",
    "/developers/partners",
    "/developers/usage",
    "/developers/profile",
    "/developers/support",
    "/developers/history",
    "/developer-terms",
    "/whitepaper",
    "/data-usage",
    "/availability",
    ...extra,
  ];
  return [...new Set(paths)].map((p) => ({
    url: `${base}${p || "/"}`,
  }));
}
