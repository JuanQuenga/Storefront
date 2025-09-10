import { NextRequest, NextResponse } from "next/server";
import { corsHeaders } from "@/lib/cors";
import { storefrontRequest, PRODUCT_SEARCH_QUERY } from "@/lib/shopify";
import { logger } from "@/lib/server-logger";

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  logger.info("Inventory search API called", { method: "GET" });

  try {
    // Vapi: ALWAYS read JSON body per docs, but handle empty body gracefully
    const bodyText = await request.text();
    logger.debug("Body text received", { bodyLength: bodyText.length });

    // Log the HTTP request with body content
    let requestBody: any = null;
    try {
      requestBody = bodyText.trim() ? JSON.parse(bodyText) : null;
      logger.debug("Parsed request body", { body: requestBody });
    } catch (e) {
      requestBody = bodyText; // Keep as string if JSON parsing fails
      logger.debug("Using raw body text", { body: requestBody });
    }

    logger.info("HTTP Request", {
      method: request.method,
      url: request.url,
      headers: Object.fromEntries(request.headers.entries()),
      body: requestBody,
    });
    let bodyJson = null;

    if (bodyText.trim()) {
      try {
        bodyJson = JSON.parse(bodyText);
      } catch (parseError) {
        logger.warn("Failed to parse request body as JSON", {
          error: parseError,
        });
        // Continue with null bodyJson - will use query params as fallback
      }
    }

    // Extract from Vapi tool call - simplified to always use toolCallList[0]
    let toolCallId: string | undefined;
    let vapiArgs: any = {};

    if (bodyJson?.message?.toolCallList?.[0]) {
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
          logger.warn("Failed to parse message query param", { error: e });
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

    logger.debug("Making Shopify request", { query, limit, cursor });
    const response = await storefrontRequest(PRODUCT_SEARCH_QUERY, {
      query: query,
      first: limit,
      after: cursor,
    });

    if (!response?.data?.products) {
      logger.error("Failed to fetch products from Shopify", { response });
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

    const responseObj = NextResponse.json(responseData, {
      headers: corsHeaders(request.headers.get("origin") || undefined),
    });

    // Log successful response
    const responseTime = Date.now() - startTime;
    logger.info("HTTP Response", {
      method: request.method,
      url: request.url,
      statusCode: 200,
      responseTime: `${responseTime}ms`,
      productsFound: transformedProducts.length,
    });

    return responseObj;
  } catch (error) {
    logger.error("Error searching products", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    // Extract toolCallId from request body for error response
    let errorToolCallId = "unknown";
    try {
      const bodyText = await request.text();
      if (bodyText.trim()) {
        const bodyJson = JSON.parse(bodyText);
        if (bodyJson?.message?.toolCallList?.[0]) {
          errorToolCallId = bodyJson.message.toolCallList[0].id;
        }
      }
    } catch (_) {}

    const errorResult = JSON.stringify({ error: "Internal server error" });
    const errorResponseData = {
      results: [{ toolCallId: errorToolCallId, result: errorResult }],
    };

    const errorResponseObj = NextResponse.json(errorResponseData, {
      status: 500,
      headers: corsHeaders(request.headers.get("origin") || undefined),
    });

    // Log error response
    const responseTime = Date.now() - startTime;
    logger.error("HTTP Response Error", {
      method: request.method,
      url: request.url,
      statusCode: 500,
      responseTime: `${responseTime}ms`,
      error: error instanceof Error ? error.message : String(error),
    });

    return errorResponseObj;
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
