import { NextRequest, NextResponse } from "next/server";
import { corsHeaders } from "@/lib/cors";
import { storefrontRequest, PRODUCT_SEARCH_QUERY } from "@/lib/shopify";

// Debug logging variables (only used in development)

export async function GET(request: NextRequest) {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Log incoming request (development only)
  if (process.env.NODE_ENV === 'development') {
    try {
      const debugModule = await import("@/app/debug-logs/page");
      const headers: Record<string, string> = {};
      request.headers.forEach((value, key) => {
        headers[key] = value;
      });

      const logEntry = {
        id: requestId,
        timestamp: new Date().toISOString(),
        method: request.method,
        url: request.url,
        headers,
        body: null as any,
      };

      debugModule.requestLogs.unshift(logEntry);
      if (debugModule.requestLogs.length > debugModule.MAX_LOGS) {
        debugModule.requestLogs.splice(debugModule.MAX_LOGS);
      }
    } catch (e) {
      // Debug page doesn't exist, skip logging
    }
  }

  try {
    // Vapi: ALWAYS read JSON body per docs, but handle empty body gracefully
    const bodyText = await request.text();

    // Update log with body content
    if (process.env.NODE_ENV === 'development') {
      try {
        const debugModule = await import("@/app/debug-logs/page");
        const logEntry = debugModule.requestLogs.find((log: any) => log.id === requestId);
        if (logEntry) {
          try {
            logEntry.body = bodyText.trim() ? JSON.parse(bodyText) : null;
          } catch (e) {
            logEntry.body = bodyText; // Keep as string if JSON parsing fails
          }
        }
      } catch (e) {
        // Debug page doesn't exist, skip logging
      }
    }
    let bodyJson = null;

    if (bodyText.trim()) {
      try {
        bodyJson = JSON.parse(bodyText);
      } catch (parseError) {
        console.warn("Failed to parse request body as JSON:", parseError);
        // Continue with null bodyJson - will use query params as fallback
      }
    }

    // Extract from Vapi tool call (always present)
    let toolCallId: string | undefined;
    let vapiArgs: any = {};

    // Try to extract from JSON body first
    const callFromMessage =
      bodyJson && Array.isArray(bodyJson?.message?.toolCallList)
        ? bodyJson.message.toolCallList[0]
        : undefined;
    const callFromToolCall = bodyJson?.toolCall;
    const directArgs = bodyJson?.arguments;

    if (callFromMessage) {
      toolCallId = callFromMessage.id;
      vapiArgs =
        callFromMessage.arguments || callFromMessage.function?.parameters || {};
    } else if (
      callFromToolCall &&
      (callFromToolCall.arguments || callFromToolCall.function?.parameters)
    ) {
      toolCallId = callFromToolCall.id;
      vapiArgs =
        callFromToolCall.arguments ||
        callFromToolCall.function?.parameters ||
        {};
    } else if (directArgs) {
      toolCallId = bodyJson.id || "vapi-direct-args";
      vapiArgs = directArgs;
    } else if (bodyJson && (bodyJson.q || bodyJson.limit || bodyJson.cursor)) {
      toolCallId = bodyJson.id || "vapi-simple-body";
      vapiArgs = {
        q: bodyJson.q,
        limit: bodyJson.limit,
        cursor: bodyJson.cursor,
      };
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
          console.warn("Failed to parse message query param:", e);
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

    // Inputs (Vapi format)
    const query = vapiArgs.q || "";
    const limit = Math.min(parseInt(String(vapiArgs.limit ?? 5)), 50);
    const cursor = vapiArgs.cursor || null;

    const response = await storefrontRequest(PRODUCT_SEARCH_QUERY, {
      query: query,
      first: limit,
      after: cursor,
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
    const responseData = {
      results: [{ toolCallId: toolCallId || "unknown", result: serialized }],
    };

    // Log successful response
    if (process.env.NODE_ENV === 'development') {
      try {
        const debugModule = await import("@/app/debug-logs/page");
        const logEntry = debugModule.requestLogs.find((log: any) => log.id === requestId);
        if (logEntry) {
          logEntry.response = responseData;
          logEntry.status = 200;
        }
      } catch (e) {
        // Debug page doesn't exist, skip logging
      }
    }

    return NextResponse.json(
      responseData,
      { headers: corsHeaders(request.headers.get("origin") || undefined) }
    );
  } catch (error) {
    console.error("Error searching products:", error);
    // Try to extract toolCallId from the request body for error response
    let errorToolCallId = "unknown";
    try {
      const bodyText = await request.text();
      if (bodyText.trim()) {
        const bodyJson = JSON.parse(bodyText);
        const call = Array.isArray(bodyJson?.message?.toolCallList)
          ? bodyJson.message.toolCallList[0]
          : bodyJson?.toolCall || bodyJson;
        errorToolCallId = call?.id || "unknown";
      }
    } catch (_) {}

    const errorResult = JSON.stringify({ error: "Internal server error" });
    const errorResponseData = { results: [{ toolCallId: errorToolCallId, result: errorResult }] };

    // Log error response
    if (process.env.NODE_ENV === 'development') {
      try {
        const debugModule = await import("@/app/debug-logs/page");
        const logEntry = debugModule.requestLogs.find((log: any) => log.id === requestId);
        if (logEntry) {
          logEntry.response = errorResponseData;
          logEntry.status = 500;
          logEntry.error = error instanceof Error ? error.message : String(error);
        }
      } catch (e) {
        // Debug page doesn't exist, skip logging
      }
    }

    return NextResponse.json(
      errorResponseData,
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
