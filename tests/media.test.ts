import { describe, expect, it } from "vitest";
import { ipfsHttp } from "../src/lib/abi";
import { mediaUrl } from "../src/lib/media";

describe("token media URLs", () => {
  it("normalizes ipfs, ipns, and arweave", () => {
    expect(ipfsHttp("ipfs://QmHash/logo.png")).toBe("https://ipfs.io/ipfs/QmHash/logo.png");
    expect(ipfsHttp("ar://abc")).toBe("https://arweave.net/abc");
    expect(mediaUrl("http://example.com/a.png")).toBe("https://example.com/a.png");
    expect(mediaUrl("")).toBeNull();
  });
});
