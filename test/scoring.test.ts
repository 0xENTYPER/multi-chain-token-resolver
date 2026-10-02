import assert from "node:assert/strict";
import test from "node:test";
import { rankCandidates } from "../src/scoring.js";
import type { ProviderCandidate } from "../src/types.js";

function candidate(overrides: Partial<ProviderCandidate>): ProviderCandidate {
  return {
    provider: "fixture",
    chain: "base",
    tokenAddress: "0x21cfcfc3d8f98fc728f48341d10ad8283f6eb7ab",
    pairAddress: "pair-low",
    dex: "dex",
    pairUrl: null,
    name: "Token",
    symbol: "TOK",
    imageUrl: null,
    quoteSymbol: "WETH",
    priceUsd: 1,
    marketCapUsd: null,
    fdvUsd: 1_000_000,
    liquidityUsd: 5_000,
    volume24hUsd: 1_000,
    pairCreatedAt: null,
    fetchedAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides
  };
}

test("selects a liquid canonical pair over a thin pool with richer metadata", () => {
  const ranked = rankCandidates([
    candidate({ pairAddress: "thin", imageUrl: "https://example.com/token.png" }),
    candidate({ pairAddress: "liquid", liquidityUsd: 800_000, volume24hUsd: 300_000 })
  ]);

  assert.equal(ranked[0]?.pairAddress, "liquid");
});

test("prefers an explicit market cap when liquidity is otherwise comparable", () => {
  const ranked = rankCandidates([
    candidate({ pairAddress: "fdv-only", fdvUsd: 2_000_000 }),
    candidate({ pairAddress: "market-cap", marketCapUsd: 1_200_000, fdvUsd: 2_000_000 })
  ]);

  assert.equal(ranked[0]?.pairAddress, "market-cap");
});
