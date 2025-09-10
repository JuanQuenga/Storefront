import { NextRequest, NextResponse } from "next/server";
import { corsHeaders } from "@/lib/cors";
import { storefrontRequest, PRODUCT_SEARCH_QUERY } from "@/lib/shopify";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    // Detect Vapi GET (URL-encoded JSON in ?message=)
    const vapiMessageParam = searchParams.get("message");
    let isVapi = false;
    let vapiArgs: any = {};
    let toolCallId: string | undefined;
    if (vapiMessageParam) {
      try {
        const parsed = JSON.parse(vapiMessageParam);
        const call = Array.isArray(parsed?.toolCallList)
          ? parsed.toolCallList[0]
          : undefined;
        if (call) {
          isVapi = true;
          toolCallId = call.id;
          vapiArgs = call.arguments || call.function?.parameters || {};
        }
      } catch (_) {}
    }

    // Inputs (Vapi: q, limit defaults to 5, optional cursor)
    const query = (isVapi ? vapiArgs.q : searchParams.get("q")) || "";
    const limit = Math.min(
      parseInt(
        (isVapi
          ? String(vapiArgs.limit ?? "5")
          : searchParams.get("limit") || "20") as string
      ),
      50
    );
    const cursor =
      (isVapi ? vapiArgs.cursor : searchParams.get("cursor")) || null;
    const sortKey = searchParams.get("sort") || "RELEVANCE";
    const productType = searchParams.get("product_type");
    const vendor = searchParams.get("vendor");
    const tag = searchParams.get("tag");
    const minPrice = searchParams.get("min_price");
    const maxPrice = searchParams.get("max_price");
    const inStock = searchParams.get("in_stock") === "true";
    const availableForSale = searchParams.get("available") === "true";

    // Build search query
    let searchQuery = query;

    // Only add advanced filters for non-Vapi callers
    if (!isVapi) {
      const filters: string[] = [];
      if (productType) filters.push(`product_type:${productType}`);
      if (vendor) filters.push(`vendor:${vendor}`);
      if (tag) filters.push(`tag:${tag}`);
      if (minPrice) filters.push(`price:>=${minPrice}`);
      if (maxPrice) filters.push(`price:<=${maxPrice}`);
      // inventory_quantity filter isn't supported in Storefront tokenless; use available_for_sale only
      if (availableForSale !== undefined) {
        filters.push(`available_for_sale:${availableForSale}`);
      }
      if (filters.length > 0) {
        searchQuery = `${query} ${filters.join(" ")}`.trim();
      }
    }

    // Execute GraphQL query
    const response = await storefrontRequest(PRODUCT_SEARCH_QUERY, {
      query: searchQuery,
      first: limit,
      after: cursor,
    });

    if (!response?.data?.products) {
      return NextResponse.json(
        { error: "Failed to fetch products" },
        { status: 500 }
      );
    }

    const { products } = response.data;

    // Transform products
    const transformedProducts = products.edges.map(
      ({ node }: { node: any }) => {
        const currency = node.priceRange.minVariantPrice.currencyCode;
        const minPrice = node.priceRange.minVariantPrice.amount;
        const hasAvailableVariant = node.variants.edges.some(
          ({ node: v }: { node: any }) =>
            Boolean(v.availableForSale) || (v.quantityAvailable ?? 0) > 0
        );
        return {
          id: node.id,
          title: node.title,
          handle: node.handle,
          description: node.description,
          productType: node.productType,
          vendor: node.vendor,
          priceRange: {
            min: minPrice,
            max: node.priceRange.maxVariantPrice.amount,
            currency,
          },
          inStock: hasAvailableVariant,
          variants: node.variants.edges.map(
            ({ node: variant }: { node: any }) => ({
              id: variant.id,
              title: variant.title,
              sku: variant.sku,
              price: variant.price.amount,
              compareAtPrice: variant.compareAtPrice?.amount || null,
              inventoryQuantity: variant.quantityAvailable,
              availableForSale: variant.availableForSale,
              options: variant.selectedOptions,
            })
          ),
          images: node.images.edges.map(({ node: image }: { node: any }) => ({
            url: image.url,
            altText: image.altText,
          })),
        };
      }
    );

    // If Vapi, return a human-readable string wrapped per Vapi spec
    if (isVapi) {
      let spoken = "";
      if (transformedProducts.length === 0) {
        spoken = query
          ? `I couldn't find any products for "${query}".`
          : "I couldn't find any matching products.";
      } else {
        const lines = transformedProducts
          .slice(0, limit)
          .map((p: any, idx: number) => {
            const price = p.priceRange.min;
            const currency = p.priceRange.currency;
            const status = p.inStock ? "in stock" : "out of stock";
            return `${idx + 1}. ${p.title} — ${price} ${currency}, ${status}`;
          });
        spoken =
          `Found ${transformedProducts.length} product${
            transformedProducts.length === 1 ? "" : "s"
          }. Top ${Math.min(limit, transformedProducts.length)}: ` +
          lines.join("; ");
      }
      return NextResponse.json(
        { results: [{ toolCallId: toolCallId || "unknown", result: spoken }] },
        { headers: corsHeaders(request.headers.get("origin") || undefined) }
      );
    }

    return NextResponse.json(
      {
        products: transformedProducts,
        pagination: {
          hasNextPage: products.pageInfo.hasNextPage,
          endCursor: products.pageInfo.endCursor,
          totalCount: transformedProducts.length,
        },
      },
      { headers: corsHeaders(request.headers.get("origin") || undefined) }
    );
  } catch (error) {
    console.error("Error searching products:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      {
        status: 500,
        headers: corsHeaders(request.headers.get("origin") || undefined),
      }
    );
  }
}

// POST method for advanced search with multiple filters
export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.json();

    // Detect Vapi tool-call wrapper per docs: https://docs.vapi.ai/tools/custom-tools#request-format-understanding-the-tool-call-request
    const vapiMessage = rawBody?.message;
    const vapiToolCall = Array.isArray(vapiMessage?.toolCallList)
      ? vapiMessage.toolCallList[0]
      : undefined;
    const isVapi = Boolean(vapiToolCall);
    const vapiArgs =
      vapiToolCall?.arguments || vapiToolCall?.function?.parameters || {};

    // Single, simplified shape: only { q, limit? } — limit defaults to 5
    const body = (isVapi ? vapiArgs : rawBody) || {};
    const q = (body.q ?? "").toString();
    const limit = Math.min(Number(body.limit ?? 5), 50);
    const cursor = body.cursor ?? null;

    const response = await storefrontRequest(PRODUCT_SEARCH_QUERY, {
      query: q,
      first: limit,
      after: cursor,
    });

    if (!response?.data?.products) {
      return NextResponse.json(
        { error: "Failed to fetch products" },
        { status: 500 }
      );
    }

    const { products } = response.data;

    const transformedProducts = products.edges.map(
      ({ node }: { node: any }) => ({
        id: node.id,
        title: node.title,
        handle: node.handle,
        description: node.description,
        productType: node.productType,
        vendor: node.vendor,
        priceRange: {
          min: node.priceRange.minVariantPrice.amount,
          max: node.priceRange.maxVariantPrice.amount,
          currency: node.priceRange.minVariantPrice.currencyCode,
        },
        variants: node.variants.edges.map(
          ({ node: variant }: { node: any }) => ({
            id: variant.id,
            title: variant.title,
            sku: variant.sku,
            price: variant.price.amount,
            compareAtPrice: variant.compareAtPrice?.amount || null,
            inventoryQuantity: variant.quantityAvailable,
            availableForSale: variant.availableForSale,
            options: variant.selectedOptions,
          })
        ),
        images: node.images.edges.map(({ node: image }: { node: any }) => ({
          url: image.url,
          altText: image.altText,
        })),
      })
    );

    const payload = {
      products: transformedProducts,
      pagination: {
        hasNextPage: products.pageInfo.hasNextPage,
        endCursor: products.pageInfo.endCursor,
        totalCount: transformedProducts.length,
      },
    };

    // If this is a Vapi tool-call, wrap in { results: [{ toolCallId, result }] }
    if (isVapi) {
      const toolCallId = vapiToolCall.id;
      return NextResponse.json(
        { results: [{ toolCallId, result: payload }] },
        { headers: corsHeaders(request.headers.get("origin") || undefined) }
      );
    }

    return NextResponse.json(payload, {
      headers: corsHeaders(request.headers.get("origin") || undefined),
    });
  } catch (error) {
    console.error("Error in advanced search:", error);
    // If request was from Vapi, return wrapped error
    try {
      const rawBody = await request.json();
      const vapiMessage = rawBody?.message;
      const vapiToolCall = Array.isArray(vapiMessage?.toolCallList)
        ? vapiMessage.toolCallList[0]
        : undefined;
      if (vapiToolCall) {
        return NextResponse.json(
          {
            results: [
              {
                toolCallId: vapiToolCall.id,
                result: { error: "Internal server error" },
              },
            ],
          },
          {
            status: 500,
            headers: corsHeaders(request.headers.get("origin") || undefined),
          }
        );
      }
    } catch (_) {}

    return NextResponse.json(
      { error: "Internal server error" },
      {
        status: 500,
        headers: corsHeaders(request.headers.get("origin") || undefined),
      }
    );
  }
}

// Preflight support
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    headers: corsHeaders(request.headers.get("origin") || undefined),
  });
}
