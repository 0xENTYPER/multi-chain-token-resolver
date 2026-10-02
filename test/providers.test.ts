import assert from "node:assert/strict";
import test from "node:test";
import { DexScreenerProvider } from "../src/providers/dex-screener.js";

const ADDRESS = "0x21cfcfc3d8f98fc728f48341d10ad8283f6eb7ab";

test("DexScreener adapter rejects quote-side matches to avoid a wrong token price", async () => {
  const fetchStub: typeof fetch = async () => new Response(JSON.stringify([
    {
      pairAddress: "wrong-orientation",
      dexId: "dex",
      baseToken: { address: "0x0000000000000000000000000000000000000001", symbol: "OTHER" },
      quoteToken: { address: ADDRESS, symbol: "TARGET" },
      priceUsd: "999"
    },
    {
      pairAddress: "correct-orientation",
      dexId: "dex",
      baseToken: { address: ADDRESS, name: "Target", symbol: "TARGET" },
      quoteToken: { address: "0x0000000000000000000000000000000000000002", symbol: "WETH" },
      priceUsd: "0.25",
      liquidity: { usd: 200000 },
      fdv: 2500000
    }
  ]), { status: 200 });

  const candidates = await new DexScreenerProvider().resolve(
    { address: ADDRESS, chain: "base" },
    { fetch: fetchStub, now: () => new Date("2026-10-03T00:00:00Z") }
  );

  assert.equal(candidates.length, 1);
  assert.equal(candidates[0]?.pairAddress, "correct-orientation");
  assert.equal(candidates[0]?.priceUsd, 0.25);
});
