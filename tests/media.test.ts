import { describe, expect, it } from "vitest";
import { ipfsHttp } from "../src/lib/abi";
import { geckoRelAddress } from "../src/lib/gecko";
import { mediaUrl } from "../src/lib/media";

describe("token media URLs", () => {
  it("normalizes ipfs, ipns, and arweave", () => {
    expect(ipfsHttp("ipfs://QmHash/logo.png")).toBe("https://ipfs.io/ipfs/QmHash/logo.png");
    expect(ipfsHttp("ar://abc")).toBe("https://arweave.net/abc");
    expect(mediaUrl("http://example.com/a.png")).toBe("https://example.com/a.png");
    expect(mediaUrl("")).toBeNull();
  });

  it("extracts the Gecko base token, not the pool id", () => {
    expect(geckoRelAddress({ data: { id: "robinhood_0x11b70d0243baf75e85ce03201a92b5b7c33beb59", type: "token" } })).toBe(
      "0x11b70d0243baf75e85ce03201a92b5b7c33beb59",
    );
  });
});
