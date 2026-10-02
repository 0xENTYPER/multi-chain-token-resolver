import { normalizeRequest, sameAddress } from "../address.js";
import { PROVIDER_CHAIN_IDS } from "../chains.js";
import { dateFromIso, positiveNumber } from "../number.js";
import type {
  ProviderCandidate,
  ProviderContext,
  ResolveRequest,
  TokenDataProvider
} from "../types.js";

interface GeckoResource {
  id?: string;
  type?: string;
  attributes?: Record<string, unknown>;
  relationships?: {
    base_token?: { data?: { id?: string } };
    quote_token?: { data?: { id?: string } };
    dex?: { data?: { id?: string } };
  };
}

interface GeckoResponse {
  data?: GeckoResource[];
  included?: GeckoResource[];
}

function tokenAddressFromId(id: string | undefined): string | null {
  if (!id) return null;
  const separator = id.indexOf("_");
  return separator === -1 ? id : id.slice(separator + 1);
}

export class GeckoTerminalProvider implements TokenDataProvider {
  readonly name = "gecko-terminal";

  async resolve(
    request: Required<ResolveRequest>,
    context: ProviderContext
  ): Promise<ProviderCandidate[]> {
    const normalized = normalizeRequest(request);
    const network = PROVIDER_CHAIN_IDS[normalized.chain].geckoTerminal;
    const url = new URL(
      `https://api.geckoterminal.com/api/v2/networks/${network}/tokens/${normalized.address}/pools`
    );
    url.searchParams.set("include", "base_token,quote_token,dex");
    url.searchParams.set("page", "1");

    const response = await context.fetch(url, {
      headers: { accept: "application/json;version=20230302" }
    });
    if (!response.ok) throw new Error(`GeckoTerminal returned HTTP ${response.status}`);

    const payload = (await response.json()) as GeckoResponse;
    const included = new Map((payload.included ?? []).map((item) => [item.id, item]));

    return (payload.data ?? []).flatMap((pool): ProviderCandidate[] => {
      const baseId = pool.relationships?.base_token?.data?.id;
      const baseAddress = tokenAddressFromId(baseId);
      if (!baseAddress || !sameAddress(baseAddress, normalized.address, normalized.family)) {
        return [];
      }

      const attributes = pool.attributes ?? {};
      const base = baseId ? included.get(baseId) : undefined;
      const quoteId = pool.relationships?.quote_token?.data?.id;
      const quote = quoteId ? included.get(quoteId) : undefined;
      const dexId = pool.relationships?.dex?.data?.id;
      const pairAddress = typeof attributes.address === "string"
        ? attributes.address
        : tokenAddressFromId(pool.id);
      if (!pairAddress) return [];

      return [{
        provider: this.name,
        chain: normalized.chain,
        tokenAddress: normalized.address,
        pairAddress,
        dex: dexId ?? "unknown",
        pairUrl: `https://www.geckoterminal.com/${network}/pools/${pairAddress}`,
        name: typeof base?.attributes?.name === "string" ? base.attributes.name : null,
        symbol: typeof base?.attributes?.symbol === "string" ? base.attributes.symbol : null,
        imageUrl: typeof base?.attributes?.image_url === "string" ? base.attributes.image_url : null,
        quoteSymbol: typeof quote?.attributes?.symbol === "string" ? quote.attributes.symbol : null,
        priceUsd: positiveNumber(attributes.base_token_price_usd),
        marketCapUsd: positiveNumber(attributes.market_cap_usd),
        fdvUsd: positiveNumber(attributes.fdv_usd),
        liquidityUsd: positiveNumber(attributes.reserve_in_usd),
        volume24hUsd: positiveNumber(
          typeof attributes.volume_usd === "object" && attributes.volume_usd !== null
            ? (attributes.volume_usd as Record<string, unknown>).h24
            : null
        ),
        pairCreatedAt: dateFromIso(attributes.pool_created_at),
        fetchedAt: context.now()
      }];
    });
  }
}
