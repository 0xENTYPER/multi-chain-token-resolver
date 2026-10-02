import { normalizeRequest, sameAddress } from "../address.js";
import { PROVIDER_CHAIN_IDS } from "../chains.js";
import { dateFromMilliseconds, positiveNumber } from "../number.js";
import type {
  ProviderCandidate,
  ProviderContext,
  ResolveRequest,
  TokenDataProvider
} from "../types.js";

interface DexToken {
  address?: string;
  name?: string;
  symbol?: string;
}

interface DexPair {
  chainId?: string;
  dexId?: string;
  url?: string;
  pairAddress?: string;
  baseToken?: DexToken;
  quoteToken?: DexToken;
  priceUsd?: string;
  volume?: { h24?: number };
  liquidity?: { usd?: number };
  fdv?: number;
  marketCap?: number;
  pairCreatedAt?: number;
  info?: { imageUrl?: string };
}

export class DexScreenerProvider implements TokenDataProvider {
  readonly name = "dex-screener";

  async resolve(
    request: Required<ResolveRequest>,
    context: ProviderContext
  ): Promise<ProviderCandidate[]> {
    const normalized = normalizeRequest(request);
    const chainId = PROVIDER_CHAIN_IDS[normalized.chain].dexScreener;
    const url = `https://api.dexscreener.com/token-pairs/v1/${chainId}/${normalized.address}`;
    const response = await context.fetch(url, { headers: { accept: "application/json" } });
    if (!response.ok) throw new Error(`DexScreener returned HTTP ${response.status}`);

    const payload = (await response.json()) as unknown;
    if (!Array.isArray(payload)) return [];

    return payload.flatMap((value): ProviderCandidate[] => {
      const pair = value as DexPair;
      const baseAddress = pair.baseToken?.address;
      if (!baseAddress || !sameAddress(baseAddress, normalized.address, normalized.family)) {
        return [];
      }
      if (!pair.pairAddress) return [];

      return [{
        provider: this.name,
        chain: normalized.chain,
        tokenAddress: normalized.address,
        pairAddress: pair.pairAddress,
        dex: pair.dexId ?? "unknown",
        pairUrl: pair.url ?? null,
        name: pair.baseToken?.name ?? null,
        symbol: pair.baseToken?.symbol ?? null,
        imageUrl: pair.info?.imageUrl ?? null,
        quoteSymbol: pair.quoteToken?.symbol ?? null,
        priceUsd: positiveNumber(pair.priceUsd),
        marketCapUsd: positiveNumber(pair.marketCap),
        fdvUsd: positiveNumber(pair.fdv),
        liquidityUsd: positiveNumber(pair.liquidity?.usd),
        volume24hUsd: positiveNumber(pair.volume?.h24),
        pairCreatedAt: dateFromMilliseconds(pair.pairCreatedAt),
        fetchedAt: context.now()
      }];
    });
  }
}
