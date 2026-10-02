export type ChainFamily = "evm" | "solana";

export type SupportedChain =
  | "ethereum"
  | "base"
  | "bsc"
  | "arbitrum"
  | "optimism"
  | "polygon"
  | "avalanche"
  | "solana";

export type CapitalizationKind = "market-cap" | "fdv" | "unavailable";
export type ConfidenceLevel = "high" | "medium" | "low";

export interface ResolveRequest {
  address: string;
  chain?: SupportedChain;
}

export interface TokenIdentity {
  address: string;
  chain: SupportedChain;
  family: ChainFamily;
  name: string | null;
  symbol: string | null;
  imageUrl: string | null;
}

export interface SelectedPair {
  address: string;
  dex: string;
  url: string | null;
  quoteSymbol: string | null;
  liquidityUsd: number | null;
  volume24hUsd: number | null;
  createdAt: string | null;
}

export interface Capitalization {
  kind: CapitalizationKind;
  usd: number | null;
  source: string | null;
}

export interface DataSource {
  provider: string;
  fetchedAt: string;
  candidateCount: number;
}

export interface ResolutionConfidence {
  level: ConfidenceLevel;
  score: number;
  reasons: string[];
}

export interface ResolvedToken {
  token: TokenIdentity;
  priceUsd: number | null;
  capitalization: Capitalization;
  fdvUsd: number | null;
  marketCapUsd: number | null;
  pair: SelectedPair;
  confidence: ResolutionConfidence;
  sources: DataSource[];
  warnings: string[];
}

export interface ProviderContext {
  fetch: typeof globalThis.fetch;
  now: () => Date;
}

export interface ProviderCandidate {
  provider: string;
  chain: SupportedChain;
  tokenAddress: string;
  pairAddress: string;
  dex: string;
  pairUrl: string | null;
  name: string | null;
  symbol: string | null;
  imageUrl: string | null;
  quoteSymbol: string | null;
  priceUsd: number | null;
  marketCapUsd: number | null;
  fdvUsd: number | null;
  liquidityUsd: number | null;
  volume24hUsd: number | null;
  pairCreatedAt: Date | null;
  fetchedAt: Date;
}

export interface TokenDataProvider {
  readonly name: string;
  resolve(request: Required<ResolveRequest>, context: ProviderContext): Promise<ProviderCandidate[]>;
}
