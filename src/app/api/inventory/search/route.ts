import { NextRequest, NextResponse } from "next/server";
import { corsHeaders } from "@/lib/cors";
import { storefrontRequest, PRODUCT_SEARCH_QUERY } from "@/lib/shopify";
import { logger } from "@/lib/server-logger";

export async function GET(request: NextRequest) {
  // Log raw incoming request
  const rawBody = await request.text();
  logger.info("Raw incoming request", {
    method: request.method,
    url: request.url,
    headers: Object.fromEntries(request.headers.entries()),
    body: rawBody,
  });

  try {
    // Parse request body
    let requestBody: any = null;
    let bodyJson = null;

    if (rawBody.trim().length > 0) {
      try {
        requestBody = JSON.parse(rawBody);
        bodyJson = requestBody;
      } catch (jsonError) {
        requestBody = rawBody;
        bodyJson = null;
      }
    }

    // Extract from Vapi tool call - simplified to always use toolCallList[0]
    let toolCallId: string | undefined;
    let vapiArgs: any = {};
    let isVapiRequest = false;

    if (bodyJson?.message?.toolCallList?.[0]) {
      isVapiRequest = true;
      const toolCall = bodyJson.message.toolCallList[0];
      toolCallId = toolCall.id;
      vapiArgs = toolCall.arguments || toolCall.function?.parameters || {};
    }

    // Fallback: Extract from query parameters if no valid body
    if (!toolCallId) {
      const url = new URL(request.url);
      const query =
        url.searchParams.get("q") || url.searchParams.get("query") || "";
      const limit = url.searchParams.get("limit");
      const cursor = url.searchParams.get("cursor");

      // Check if there's a message parameter with JSON
      const messageParam = url.searchParams.get("message");
      if (messageParam) {
        try {
          const decodedMessage = JSON.parse(decodeURIComponent(messageParam));
          if (decodedMessage.toolCallList && decodedMessage.toolCallList[0]) {
            const toolCall = decodedMessage.toolCallList[0];
            toolCallId = toolCall.id;
            vapiArgs =
              toolCall.arguments || toolCall.function?.parameters || {};
          }
        } catch (e) {
          // Ignore parse errors
        }
      }

      // If still no toolCallId, use simple query params
      if (!toolCallId && (query || limit || cursor)) {
        toolCallId = "query-params-fallback";
        vapiArgs = {
          q: query,
          limit: limit ? parseInt(limit) : undefined,
          cursor: cursor || undefined,
        };
      }
    }

    // Final parameter resolution
    const finalQuery = vapiArgs.q || "";
    const finalLimit = Math.min(parseInt(String(vapiArgs.limit ?? 5)), 50);
    const finalCursor = vapiArgs.cursor || null;
    const response = await storefrontRequest(PRODUCT_SEARCH_QUERY, {
      query: finalQuery,
      first: finalLimit,
      after: finalCursor,
    });

    if (!response?.data?.products) {
      const errorResult = JSON.stringify({ error: "Failed to fetch products" });
      return NextResponse.json(
        {
          results: [
            { toolCallId: toolCallId || "unknown", result: errorResult },
          ],
        },
        {
          status: 500,
          headers: corsHeaders(request.headers.get("origin") || undefined),
        }
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

    // Always return Vapi response format
    const resultData = {
      query: finalQuery,
      totalFound: transformedProducts.length,
      products: transformedProducts.slice(0, finalLimit).map((p: any) => ({
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
    const responseData = {
      results: [{ toolCallId: toolCallId || "unknown", result: serialized }],
    };

    return NextResponse.json(responseData, {
      headers: corsHeaders(request.headers.get("origin") || undefined),
    });
  } catch (error) {
    logger.error("Request failed", {
      error: error instanceof Error ? error.message : String(error),
    });

    const errorResult = JSON.stringify({ error: "Internal server error" });
    const errorResponseData = {
      results: [{ toolCallId: "unknown", result: errorResult }],
    };

    return NextResponse.json(errorResponseData, {
      status: 500,
      headers: corsHeaders(request.headers.get("origin") || undefined),
    });
  }
}

// POST method for advanced search with multiple filters
export async function POST(request: NextRequest) {
  // Log raw incoming request
  const rawBody = await request.text();
  logger.info("Raw incoming POST request", {
    method: request.method,
    url: request.url,
    headers: Object.fromEntries(request.headers.entries()),
    body: rawBody,
  });

  try {
    // Parse request body
    let requestBody: any = null;
    let bodyJson = null;

    if (rawBody.trim().length > 0) {
      try {
        requestBody = JSON.parse(rawBody);
        bodyJson = requestBody;
      } catch (jsonError) {
        requestBody = rawBody;
        bodyJson = null;
      }
    }

    // Detect Vapi tool-call wrapper
    const vapiMessage = requestBody?.message;
    const vapiToolCall = Array.isArray(vapiMessage?.toolCallList)
      ? vapiMessage.toolCallList[0]
      : undefined;
    const isVapi = Boolean(vapiToolCall);
    const vapiArgs =
      vapiToolCall?.arguments || vapiToolCall?.function?.parameters || {};

    // Single, simplified shape: only { q, limit? } — limit defaults to 5
    const body = (isVapi ? vapiArgs : requestBody) || {};
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
      const responseData = { results: [{ toolCallId, result: payload }] };

      return NextResponse.json(responseData, {
        headers: corsHeaders(request.headers.get("origin") || undefined),
      });
    }

    return NextResponse.json(payload, {
      headers: corsHeaders(request.headers.get("origin") || undefined),
    });
  } catch (error) {
    logger.error("POST request failed", {
      error: error instanceof Error ? error.message : String(error),
    });

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
