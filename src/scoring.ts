import { PREFERRED_QUOTES } from "./chains.js";
import type { ProviderCandidate } from "./types.js";

function logarithmic(value: number | null, weight: number): number {
  return value === null ? 0 : Math.log10(Math.max(1, value)) * weight;
}

export function scoreCandidate(candidate: ProviderCandidate): number {
  let score = 100;
  score += logarithmic(candidate.liquidityUsd, 14);
  score += logarithmic(candidate.volume24hUsd, 8);
  if (candidate.priceUsd !== null && candidate.priceUsd > 0) score += 20;
  if (candidate.marketCapUsd !== null) score += 14;
  else if (candidate.fdvUsd !== null) score += 6;
  if (candidate.imageUrl) score += 4;
  if (candidate.quoteSymbol && PREFERRED_QUOTES.has(candidate.quoteSymbol.toUpperCase())) score += 12;
  return score;
}

export function rankCandidates(candidates: ProviderCandidate[]): ProviderCandidate[] {
  return [...candidates].sort((left, right) => {
    const scoreDelta = scoreCandidate(right) - scoreCandidate(left);
    if (scoreDelta !== 0) return scoreDelta;
    return right.fetchedAt.getTime() - left.fetchedAt.getTime();
  });
}
