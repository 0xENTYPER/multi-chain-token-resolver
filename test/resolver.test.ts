import assert from "node:assert/strict";
import test from "node:test";
import { TokenResolver } from "../src/resolver.js";
import type { ProviderCandidate, TokenDataProvider } from "../src/types.js";

const ADDRESS = "0x21cfcfc3d8f98fc728f48341d10ad8283f6eb7ab";
const NOW = new Date("2026-10-03T00:00:00Z");

function candidate(overrides: Partial<ProviderCandidate> = {}): ProviderCandidate {
  return {
    provider: "primary",
    chain: "base",
    tokenAddress: ADDRESS,
    pairAddress: "0xpair",
    dex: "example-dex",
    pairUrl: null,
    name: "Example Token",
    symbol: "EXAMPLE",
    imageUrl: null,
    quoteSymbol: "WETH",
    priceUsd: 0.25,
    marketCapUsd: null,
    fdvUsd: 2_500_000,
    liquidityUsd: 250_000,
    volume24hUsd: 80_000,
    pairCreatedAt: new Date("2026-09-01T00:00:00Z"),
    fetchedAt: NOW,
    ...overrides
  };
}

function provider(name: string, values: ProviderCandidate[]): TokenDataProvider {
  return {
    name,
    async resolve() {
      return values.map((value) => ({ ...value, provider: name }));
    }
  };
}

test("keeps FDV explicit when verified market cap is unavailable", async () => {
  const resolver = new TokenResolver({
    providers: [provider("primary", [candidate()])],
    now: () => NOW
  });

  const result = await resolver.resolve({ address: ADDRESS, chain: "base" });
  assert.equal(result.capitalization.kind, "fdv");
  assert.equal(result.capitalization.usd, 2_500_000);
  assert.equal(result.marketCapUsd, null);
  assert.match(result.warnings[0] ?? "", /FDV/);
});

test("uses metadata fallback without replacing the selected market pair", async () => {
  const resolver = new TokenResolver({
    providers: [
      provider("market", [candidate({ pairAddress: "liquid", liquidityUsd: 900_000 })]),
      provider("metadata", [candidate({
        pairAddress: "thin",
        liquidityUsd: 1_000,
        imageUrl: "https://example.com/token.png"
      })])
    ],
    now: () => NOW
  });

  const result = await resolver.resolve({ address: ADDRESS, chain: "base" });
  assert.equal(result.pair.address, "liquid");
  assert.equal(result.token.imageUrl, "https://example.com/token.png");
  assert.equal(result.sources.length, 2);
});

test("caches a resolution for the configured TTL", async () => {
  let calls = 0;
  const countingProvider: TokenDataProvider = {
    name: "counting",
    async resolve() {
      calls += 1;
      return [candidate()];
    }
  };
  const resolver = new TokenResolver({
    providers: [countingProvider],
    now: () => NOW,
    cacheTtlMs: 30_000
  });

  await resolver.resolve({ address: ADDRESS, chain: "base" });
  await resolver.resolve({ address: ADDRESS, chain: "base" });
  assert.equal(calls, 1);
});
