#!/usr/bin/env node
import { DexScreenerProvider } from "./providers/dex-screener.js";
import { GeckoTerminalProvider } from "./providers/gecko-terminal.js";
import { TokenResolver } from "./resolver.js";
import type { SupportedChain } from "./types.js";

function argument(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

const address = argument("--address") ?? process.argv[2];
const chain = argument("--chain") as SupportedChain | undefined;

if (!address) {
  console.error("Usage: token-resolve --address <token> [--chain base|bsc|ethereum|solana|...]");
  process.exitCode = 1;
} else {
  const resolver = new TokenResolver({
    providers: [new DexScreenerProvider(), new GeckoTerminalProvider()]
  });

  try {
    const result = await resolver.resolve({ address, ...(chain ? { chain } : {}) });
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
