import { encodeFunctionData, type Hex } from "viem";
import { CHAIN, isAddress } from "./chain";
import { PONS } from "./pons";
import { ethCall, hexToBigInt } from "./rpc";
import { getPonsToken, getPonsProtocol } from "./pons";

const ZERO = "0x0000000000000000000000000000000000000000" as const;

const launchAbi = [
  {
    type: "function",
    name: "launchToken",
    stateMutability: "payable",
    inputs: [
      {
        name: "params",
        type: "tuple",
        components: [
          { name: "name", type: "string" },
          { name: "symbol", type: "string" },
          { name: "logo", type: "string" },
          { name: "description", type: "string" },
          {
            name: "socials",
            type: "tuple",
            components: [
              { name: "twitter", type: "string" },
              { name: "telegram", type: "string" },
              { name: "discord", type: "string" },
              { name: "website", type: "string" },
              { name: "farcaster", type: "string" },
            ],
          },
          { name: "creatorFeeRecipient", type: "address" },
          { name: "creatorTaxBps", type: "uint16" },
          { name: "buybackEnabled", type: "bool" },
          { name: "expectedEconomics", type: "bytes32" },
        ],
      },
      { name: "launchConfigId", type: "uint256" },
      { name: "pairToken", type: "address" },
    ],
    outputs: [
      { name: "token", type: "address" },
      { name: "curve", type: "address" },
    ],
  },
  {
    type: "function",
    name: "previewLaunchEconomics",
    stateMutability: "view",
    inputs: [
      { name: "launchConfigId", type: "uint256" },
      { name: "pairToken", type: "address" },
    ],
    outputs: [{ name: "", type: "bytes32" }],
  },
  {
    type: "function",
    name: "launchFee",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "launchEnabled",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

export type LaunchDraft = {
  name: string;
  symbol: string;
  description?: string;
  logo?: string;
  twitter?: string;
  telegram?: string;
  website?: string;
  creatorFeeRecipient?: string;
  creatorTaxBps?: number;
  buybackEnabled?: boolean;
  launchConfigId?: number;
};

function factory() {
  return PONS.v2.factory as `0x${string}`;
}

export async function previewPonsLaunch(draft: LaunchDraft) {
  const launchConfigId = BigInt(draft.launchConfigId ?? 0);
  const pairToken = ZERO;
  const [economics, feeHex, enabledHex] = await Promise.all([
    ethCall(
      factory(),
      encodeFunctionData({
        abi: launchAbi,
        functionName: "previewLaunchEconomics",
        args: [launchConfigId, pairToken],
      }),
    ),
    ethCall(factory(), encodeFunctionData({ abi: launchAbi, functionName: "launchFee" })),
    ethCall(factory(), encodeFunctionData({ abi: launchAbi, functionName: "launchEnabled" })).catch(() => "0x"),
  ]);
  const fee = hexToBigInt(feeHex);
  const enabled = enabledHex !== "0x" && hexToBigInt(enabledHex) !== 0n;
  return {
    ok: true,
    protocol: "pons",
    generation: "v2",
    factory: PONS.v2.factory,
    app: PONS.app,
    docs: PONS.docsV2,
    launchConfigId: Number(launchConfigId),
    pairToken,
    pair: "native ETH",
    expectedEconomics: economics,
    launchFeeWei: fee.toString(),
    launchFeeEth: Number(fee) / 1e18,
    launchEnabled: enabled,
    chain: {
      chainId: CHAIN.hexId,
      chainName: CHAIN.name,
      rpcUrls: [CHAIN.rpc],
      blockExplorerUrls: [CHAIN.explorer],
      nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
    },
    attribution: PONS.attribution,
    draft: {
      name: draft.name,
      symbol: draft.symbol.toUpperCase(),
      description: draft.description || "",
    },
  };
}

export async function preparePonsLaunch(draft: LaunchDraft) {
  const name = draft.name?.trim();
  const symbol = draft.symbol?.trim().toUpperCase();
  if (!name || !symbol) return { ok: false, error: "Need a token name and ticker." };
  const preview = await previewPonsLaunch(draft);
  if (!preview.ok) return preview;
  const recipient =
    draft.creatorFeeRecipient && isAddress(draft.creatorFeeRecipient) ? draft.creatorFeeRecipient : ZERO;
  const data = encodeFunctionData({
    abi: launchAbi,
    functionName: "launchToken",
    args: [
      {
        name,
        symbol,
        logo: draft.logo || "",
        description: draft.description || "",
        socials: {
          twitter: draft.twitter || "",
          telegram: draft.telegram || "",
          website: draft.website || "",
          discord: "",
          farcaster: "",
        },
        creatorFeeRecipient: recipient as `0x${string}`,
        creatorTaxBps: draft.creatorTaxBps ?? 0,
        buybackEnabled: draft.buybackEnabled ?? true,
        expectedEconomics: preview.expectedEconomics as Hex,
      },
      BigInt(preview.launchConfigId),
      ZERO,
    ],
  });
  return {
    ...preview,
    unsignedTx: {
      to: PONS.v2.factory,
      data,
      value: "0x" + BigInt(preview.launchFeeWei).toString(16),
      chainId: CHAIN.hexId,
    },
    wallet: {
      method: "eth_sendTransaction",
      addChain: "wallet_addEthereumChain",
      provider: "phantom.ethereum or any EIP-1193 wallet",
    },
    note: "Apogee builds the unsigned pons v2 launch. Your Phantom (or other ETH wallet) signs. Apogee never holds keys and does not broadcast unless you sign.",
  };
}

export async function preparePonsBuy(address: string, ethAmount?: string) {
  const token = await getPonsToken(address).catch(() => null);
  const protocol = await getPonsProtocol();
  return {
    ok: true,
    readOnlyQuote: token,
    app: PONS.app,
    amountEth: ethAmount || null,
    note: "Curve buys are executed in the pons app or by signing against the token curve. Apogee will not broadcast a buy. Chat can prepare a launch; buys stay on pons.",
    protocol,
  };
}

export async function getCurveQuote(address: string) {
  const token = await getPonsToken(address);
  return token;
}

export async function getMcpInfo() {
  return {
    ok: true,
    name: "apogee",
    url: "https://apogeemcp.digital/api/mcp",
    alias: "https://apogeemcp.digital/mcp",
    auth: "none",
    transport: "streamable-http",
    protocol: "2025-03-26",
    tools: 3000,
    chainId: CHAIN.id,
    oneClick: {
      cursor: "Use the Add to Cursor button on https://apogeemcp.digital/connect",
      claude: "https://claude.ai/settings/connectors",
      chatgpt: "https://chatgpt.com/#settings/Connectors",
      grok: "https://grok.com/manage-connectors",
    },
  };
}
