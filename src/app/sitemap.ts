import type { MetadataRoute } from "next";
import { publicSiteUrl } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = publicSiteUrl();
  return ["", "/dashboard", "/launches", "/docs", "/connect", "/orbit", "/wallet", "/analytics", "/about", "/guides", "/faq", "/links", "/privacy", "/terms", "/usage"].map((p) => ({
    url: `${base}${p || "/"}`,
    lastModified: new Date(),
  }));
}
