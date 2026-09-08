import { afterEach, describe, expect, it } from "vitest";
import { publicSiteUrl } from "../src/lib/site";

const keys = [
  "NEXT_PUBLIC_SITE_URL",
  "VERCEL_ENV",
  "VERCEL_URL",
  "VERCEL_PROJECT_PRODUCTION_URL",
] as const;

afterEach(() => {
  for (const key of keys) delete process.env[key];
});

describe("publicSiteUrl", () => {
  it("uses an explicit site URL", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://apogeemcp.digital/";
    expect(publicSiteUrl()).toBe("https://apogeemcp.digital");
  });

  it("uses the production alias on Vercel production", () => {
    process.env.VERCEL_ENV = "production";
    process.env.VERCEL_PROJECT_PRODUCTION_URL = "apogeemcpdigital.vercel.app";
    process.env.VERCEL_URL = "apogeemcpdigital-sha.vercel.app";
    expect(publicSiteUrl()).toBe("https://apogeemcpdigital.vercel.app");
  });

  it("uses the deployment host on preview", () => {
    process.env.VERCEL_ENV = "preview";
    process.env.VERCEL_URL = "apogeemcpdigital-git-preview.vercel.app";
    expect(publicSiteUrl()).toBe("https://apogeemcpdigital-git-preview.vercel.app");
  });
});
