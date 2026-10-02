import type { ChainFamily, ResolveRequest, SupportedChain } from "./types.js";

const EVM_ADDRESS = /^0x[a-fA-F0-9]{40}$/;
const BASE58 = /^[1-9A-HJ-NP-Za-km-z]+$/;

const CHAIN_FAMILY: Record<SupportedChain, ChainFamily> = {
  ethereum: "evm",
  base: "evm",
  bsc: "evm",
  arbitrum: "evm",
  optimism: "evm",
  polygon: "evm",
  avalanche: "evm",
  solana: "solana"
};

export interface NormalizedRequest extends Required<ResolveRequest> {
  family: ChainFamily;
}

export function detectAddressFamily(address: string): ChainFamily | null {
  if (EVM_ADDRESS.test(address)) return "evm";
  if (address.length >= 32 && address.length <= 44 && BASE58.test(address)) return "solana";
  return null;
}

export function normalizeRequest(request: ResolveRequest): NormalizedRequest {
  const address = request.address.trim();
  const detected = detectAddressFamily(address);
  if (!detected) throw new Error("Unsupported token address format");

  const chain = request.chain ?? (detected === "solana" ? "solana" : undefined);
  if (!chain) {
    throw new Error("EVM addresses are network-ambiguous; pass an explicit chain");
  }

  const family = CHAIN_FAMILY[chain];
  if (family !== detected) {
    throw new Error(`Address format does not match the ${chain} chain family`);
  }

  return {
    address: family === "evm" ? address.toLowerCase() : address,
    chain,
    family
  };
}

export function sameAddress(left: string, right: string, family: ChainFamily): boolean {
  return family === "evm" ? left.toLowerCase() === right.toLowerCase() : left === right;
}
