import { normalizeRequest } from "./address.js";
import { MemoryCache } from "./cache.js";
import { rankCandidates, scoreCandidate } from "./scoring.js";
import type {
  ConfidenceLevel,
  ProviderCandidate,
  ResolvedToken,
  ResolveRequest,
  TokenDataProvider
} from "./types.js";

export interface ResolverOptions {
  providers: TokenDataProvider[];
  fetch?: typeof globalThis.fetch;
  now?: () => Date;
  cacheTtlMs?: number;
}

function firstValue<T>(candidates: ProviderCandidate[], read: (item: ProviderCandidate) => T | null): T | null {
  for (const candidate of candidates) {
    const value = read(candidate);
    if (value !== null) return value;
  }
  return null;
}

function confidenceFor(candidate: ProviderCandidate, providerCount: number): {
  level: ConfidenceLevel;
  score: number;
  reasons: string[];
} {
  let score = 35;
  const reasons: string[] = [];

  if ((candidate.liquidityUsd ?? 0) >= 100_000) {
    score += 25;
    reasons.push("canonical pair has at least $100K liquidity");
  } else if ((candidate.liquidityUsd ?? 0) >= 10_000) {
    score += 12;
    reasons.push("canonical pair has at least $10K liquidity");
  } else {
    reasons.push("canonical pair has limited or unknown liquidity");
  }

  if (candidate.marketCapUsd !== null) {
    score += 15;
    reasons.push("provider returned a distinct market-cap field");
  } else if (candidate.fdvUsd !== null) {
    score += 6;
    reasons.push("only FDV is available; it is not labeled as market cap");
  }

  if (candidate.priceUsd !== null) score += 10;
  if (providerCount > 1) {
    score += 10;
    reasons.push("multiple providers returned usable candidates");
  }

  const bounded = Math.min(100, score);
  return {
    level: bounded >= 80 ? "high" : bounded >= 55 ? "medium" : "low",
    score: bounded,
    reasons
  };
}

export class TokenResolver {
  private readonly providers: TokenDataProvider[];
  private readonly fetch: typeof globalThis.fetch;
  private readonly now: () => Date;
  private readonly cache: MemoryCache<ResolvedToken>;

  constructor(options: ResolverOptions) {
    if (options.providers.length === 0) throw new Error("At least one provider is required");
    this.providers = options.providers;
    this.fetch = options.fetch ?? globalThis.fetch;
    this.now = options.now ?? (() => new Date());
    this.cache = new MemoryCache(options.cacheTtlMs ?? 30_000);
  }

  async resolve(request: ResolveRequest): Promise<ResolvedToken> {
    const normalized = normalizeRequest(request);
    const key = `${normalized.chain}:${normalized.address}`;
    const nowMs = this.now().getTime();
    const cached = this.cache.get(key, nowMs);
    if (cached) return cached;

    const providerRequest = { address: normalized.address, chain: normalized.chain };
    const settled = await Promise.allSettled(
      this.providers.map((provider) => provider.resolve(providerRequest, {
        fetch: this.fetch,
        now: this.now
      }))
    );

    const candidates = settled.flatMap((result) => result.status === "fulfilled" ? result.value : []);
    if (candidates.length === 0) {
      const failures = settled.flatMap((result, index) => result.status === "rejected"
        ? [`${this.providers[index]?.name ?? "provider"}: ${String(result.reason)}`]
        : []);
      throw new Error(failures.length > 0
        ? `No provider returned a usable base-token pair (${failures.join("; ")})`
        : "No provider returned a usable base-token pair");
    }

    const ranked = rankCandidates(candidates);
    const selected = ranked[0];
    if (!selected) throw new Error("Candidate ranking produced no result");

    const sources = [...new Set(candidates.map((candidate) => candidate.provider))];
    const marketCapUsd = firstValue(ranked, (item) => item.marketCapUsd);
    const fdvUsd = firstValue(ranked, (item) => item.fdvUsd);
    const warnings: string[] = [];

    if (marketCapUsd === null && fdvUsd !== null) {
      warnings.push("Verified market cap is unavailable; FDV is returned separately");
    }
    if ((selected.liquidityUsd ?? 0) < 10_000) {
      warnings.push("Selected pair has low or unknown USD liquidity");
    }

    const result: ResolvedToken = {
      token: {
        address: normalized.address,
        chain: normalized.chain,
        family: normalized.family,
        name: firstValue(ranked, (item) => item.name),
        symbol: firstValue(ranked, (item) => item.symbol),
        imageUrl: firstValue(ranked, (item) => item.imageUrl)
      },
      priceUsd: selected.priceUsd,
      capitalization: marketCapUsd !== null
        ? { kind: "market-cap", usd: marketCapUsd, source: firstValue(ranked, (item) => item.marketCapUsd !== null ? item.provider : null) }
        : fdvUsd !== null
          ? { kind: "fdv", usd: fdvUsd, source: firstValue(ranked, (item) => item.fdvUsd !== null ? item.provider : null) }
          : { kind: "unavailable", usd: null, source: null },
      fdvUsd,
      marketCapUsd,
      pair: {
        address: selected.pairAddress,
        dex: selected.dex,
        url: selected.pairUrl,
        quoteSymbol: selected.quoteSymbol,
        liquidityUsd: selected.liquidityUsd,
        volume24hUsd: selected.volume24hUsd,
        createdAt: selected.pairCreatedAt?.toISOString() ?? null
      },
      confidence: confidenceFor(selected, sources.length),
      sources: sources.map((provider) => ({
        provider,
        fetchedAt: firstValue(
          ranked.filter((item) => item.provider === provider),
          (item) => item.fetchedAt.toISOString()
        ) ?? this.now().toISOString(),
        candidateCount: candidates.filter((item) => item.provider === provider).length
      })),
      warnings
    };

    this.cache.set(key, result, nowMs);
    return result;
  }

  score(candidate: ProviderCandidate): number {
    return scoreCandidate(candidate);
  }
}
