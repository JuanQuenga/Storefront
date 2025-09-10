import { NextRequest, NextResponse } from "next/server";
import { corsHeaders } from "@/lib/cors";
import { storefrontRequest, PRODUCT_SEARCH_QUERY } from "@/lib/shopify";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Vapi: ALWAYS read JSON body per docs
    let isVapi = true;
    let vapiArgs: any = {};
    let toolCallId: string | undefined;
    try {
      const bodyText = await request.text();
      if (bodyText) {
        const bodyJson = JSON.parse(bodyText);
        const callFromMessage = Array.isArray(bodyJson?.message?.toolCallList)
          ? bodyJson.message.toolCallList[0]
          : undefined;
        const callFromToolCall = bodyJson?.toolCall;
        const directArgs = bodyJson?.arguments;

        if (callFromMessage) {
          isVapi = true;
          toolCallId = callFromMessage.id;
          vapiArgs =
            callFromMessage.arguments ||
            callFromMessage.function?.parameters ||
            {};
        } else if (
          callFromToolCall &&
          (callFromToolCall.arguments || callFromToolCall.function?.parameters)
        ) {
          isVapi = true;
          toolCallId = callFromToolCall.id;
          vapiArgs =
            callFromToolCall.arguments ||
            callFromToolCall.function?.parameters ||
            {};
        } else if (directArgs) {
          isVapi = true;
          toolCallId = bodyJson.id || "vapi-direct-args";
          vapiArgs = directArgs;
        } else if (
          bodyJson &&
          (bodyJson.q || bodyJson.limit || bodyJson.cursor)
        ) {
          isVapi = true;
          toolCallId = bodyJson.id || "vapi-simple-body";
          vapiArgs = {
            q: bodyJson.q,
            limit: bodyJson.limit,
            cursor: bodyJson.cursor,
          };
        }
      }
    } catch (_) {}

    // Inputs
    const query = (isVapi ? vapiArgs.q : searchParams.get("q")) || "";
    const limit = Math.min(
      parseInt(
        String(isVapi ? vapiArgs.limit ?? 5 : searchParams.get("limit") || "20")
      ),
      50
    );
    const cursor =
      (isVapi ? vapiArgs.cursor : searchParams.get("cursor")) || null;

    // Build search query (filters only for non-Vapi GETs)
    let searchQuery = query;
    if (!isVapi) {
      const productType = searchParams.get("product_type");
      const vendor = searchParams.get("vendor");
      const tag = searchParams.get("tag");
      const minPrice = searchParams.get("min_price");
      const maxPrice = searchParams.get("max_price");
      const availableForSale = searchParams.get("available");
      const filters: string[] = [];
      if (productType) filters.push(`product_type:${productType}`);
      if (vendor) filters.push(`vendor:${vendor}`);
      if (tag) filters.push(`tag:${tag}`);
      if (minPrice) filters.push(`price:>=${minPrice}`);
      if (maxPrice) filters.push(`price:<=${maxPrice}`);
      if (availableForSale !== null)
        filters.push(`available_for_sale:${availableForSale}`);
      if (filters.length > 0)
        searchQuery = `${query} ${filters.join(" ")}`.trim();
    }

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

    if (isVapi) {
      const resultData = {
        query,
        totalFound: transformedProducts.length,
        products: transformedProducts.slice(0, limit).map((p: any) => ({
          id: p.id,
          title: p.title,
          description: p.description || "No description available",
          handle: p.handle,
          productType: p.productType,
          vendor: p.vendor,
          price: p.priceRange.min,
          currency: p.priceRange.currency,
          inStock: p.inStock,
          imageUrl: p.images[0]?.url || null,
          variants: p.variants.map((v: any) => ({
            id: v.id,
            title: v.title,
            sku: v.sku,
            price: v.price,
            compareAtPrice: v.compareAtPrice,
            inventoryQuantity: v.inventoryQuantity,
            availableForSale: v.availableForSale,
          })),
        })),
      };
      const serialized = JSON.stringify(resultData);
      return NextResponse.json(
        {
          results: [
            { toolCallId: toolCallId || "unknown", result: serialized },
          ],
        },
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
