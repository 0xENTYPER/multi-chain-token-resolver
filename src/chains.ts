import type { SupportedChain } from "./types.js";

export interface ProviderChainIds {
  dexScreener: string;
  geckoTerminal: string;
}

export const PROVIDER_CHAIN_IDS: Record<SupportedChain, ProviderChainIds> = {
  ethereum: { dexScreener: "ethereum", geckoTerminal: "eth" },
  base: { dexScreener: "base", geckoTerminal: "base" },
  bsc: { dexScreener: "bsc", geckoTerminal: "bsc" },
  arbitrum: { dexScreener: "arbitrum", geckoTerminal: "arbitrum" },
  optimism: { dexScreener: "optimism", geckoTerminal: "optimism" },
  polygon: { dexScreener: "polygon", geckoTerminal: "polygon_pos" },
  avalanche: { dexScreener: "avalanche", geckoTerminal: "avax" },
  solana: { dexScreener: "solana", geckoTerminal: "solana" }
};

export const PREFERRED_QUOTES = new Set([
  "USDC",
  "USDT",
  "DAI",
  "WETH",
  "ETH",
  "WBNB",
  "BNB",
  "WSOL",
  "SOL",
  "WAVAX",
  "AVAX"
]);
