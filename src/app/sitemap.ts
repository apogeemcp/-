import type { MetadataRoute } from "next";
import { publicSiteUrl } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = publicSiteUrl();
  return ["", "/dashboard", "/launches", "/docs", "/connect", "/orbit", "/wallet", "/analytics", "/about", "/guides", "/faq", "/links", "/privacy", "/terms", "/usage", "/developers", "/developers/quickstart", "/developers/mcp", "/developers/tools", "/developers/status", "/whitepaper", "/data-usage", "/availability"].map((p) => ({
    url: `${base}${p || "/"}`,
    lastModified: new Date(),
  }));
}
