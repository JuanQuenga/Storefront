import { NextRequest, NextResponse } from "next/server";
import { corsHeaders } from "@/lib/cors";
import { storefrontRequest, PRODUCT_SEARCH_QUERY } from "@/lib/shopify";
import { logger } from "@/lib/server-logger";

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  // 🚨 COMPREHENSIVE REQUEST LOGGING 🚨
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  logger.info("🚨 === NEW REQUEST START ===", {
    requestId,
    timestamp: new Date().toISOString(),
    method: request.method,
    url: request.url,
    userAgent: request.headers.get('user-agent'),
    contentType: request.headers.get('content-type'),
    contentLength: request.headers.get('content-length'),
    origin: request.headers.get('origin'),
    referer: request.headers.get('referer'),
  });

  // Log ALL headers
  const allHeaders = Object.fromEntries(request.headers.entries());
  logger.info("📋 ALL REQUEST HEADERS", {
    requestId,
    headers: allHeaders,
    headerCount: Object.keys(allHeaders).length,
  });

  // Log URL details
  const url = new URL(request.url);
  logger.info("🔗 REQUEST URL DETAILS", {
    requestId,
    fullUrl: request.url,
    pathname: url.pathname,
    search: url.search,
    searchParams: Object.fromEntries(url.searchParams.entries()),
    queryParamCount: url.searchParams.size,
  });

  try {
    // 🔍 RAW BODY ANALYSIS 🔍
    logger.info("🔍 ANALYZING REQUEST BODY", {
      requestId,
      contentType: request.headers.get('content-type'),
      contentLength: request.headers.get('content-length'),
      hasBody: request.body !== null,
    });

    // First, try to get raw body as text for complete analysis
    let rawBodyText: string;
    try {
      rawBodyText = await request.text();
      logger.info("📄 RAW BODY TEXT CAPTURED", {
        requestId,
        bodyLength: rawBodyText.length,
        bodyPreview: rawBodyText.substring(0, 500), // First 500 chars
        isEmpty: rawBodyText.trim().length === 0,
        startsWithBrace: rawBodyText.trim().startsWith('{'),
        startsWithBracket: rawBodyText.trim().startsWith('['),
        containsNewlines: rawBodyText.includes('\n'),
        containsTabs: rawBodyText.includes('\t'),
      });
    } catch (textError) {
      logger.error("❌ FAILED TO READ RAW BODY TEXT", {
        requestId,
        error: textError instanceof Error ? textError.message : String(textError),
      });
      rawBodyText = '';
    }

    // Vapi: Read JSON body directly for better performance and proper handling
    let requestBody: any = null;
    let bodyJson = null;
    let parseMethod = 'unknown';

    if (rawBodyText.trim().length > 0) {
      try {
        // Try to read as JSON first (most common case for VAPI)
        logger.debug("🔄 ATTEMPTING JSON PARSE", {
          requestId,
          bodyLength: rawBodyText.length,
          contentType: request.headers.get('content-type'),
        });

        requestBody = JSON.parse(rawBodyText);
        bodyJson = requestBody;
        parseMethod = 'direct-json';

        logger.info("✅ JSON PARSE SUCCESS", {
          requestId,
          bodyType: typeof requestBody,
          isArray: Array.isArray(requestBody),
          topLevelKeys: Object.keys(requestBody),
          hasMessage: !!requestBody.message,
          hasToolCallList: !!requestBody.message?.toolCallList,
          toolCallCount: requestBody.message?.toolCallList?.length || 0,
        });
      } catch (jsonError) {
        logger.warn("⚠️ DIRECT JSON PARSE FAILED", {
          requestId,
          error: jsonError instanceof Error ? jsonError.message : String(jsonError),
          attemptingTextFallback: true,
        });

        try {
          // If JSON parsing fails, we already have the text
          requestBody = rawBodyText;
          bodyJson = null;
          parseMethod = 'raw-text';

          logger.info("📝 FALLBACK TO RAW TEXT", {
            requestId,
            textLength: rawBodyText.length,
            firstChars: rawBodyText.substring(0, 100),
          });
        } catch (textError) {
          logger.error("❌ TEXT FALLBACK ALSO FAILED", {
            requestId,
            error: textError instanceof Error ? textError.message : String(textError),
          });
          requestBody = null;
          bodyJson = null;
          parseMethod = 'failed';
        }
      }
    } else {
      logger.info("📭 EMPTY REQUEST BODY", {
        requestId,
        note: "No body content detected",
      });
      requestBody = null;
      bodyJson = null;
      parseMethod = 'empty';
    }

    logger.info("📊 REQUEST BODY SUMMARY", {
      requestId,
      parseMethod,
      hasBody: requestBody !== null,
      hasJson: bodyJson !== null,
      bodyType: typeof requestBody,
      isArray: Array.isArray(requestBody),
      contentLength: request.headers.get('content-length'),
      actualLength: rawBodyText?.length || 0,
    });

    // 🔍 VAPI DETECTION ANALYSIS 🔍
    logger.info("🔍 ANALYZING FOR VAPI REQUEST", {
      requestId,
      hasJsonBody: !!bodyJson,
      hasMessage: !!bodyJson?.message,
      hasToolCallList: !!bodyJson?.message?.toolCallList,
      toolCallListLength: bodyJson?.message?.toolCallList?.length || 0,
      firstToolCall: bodyJson?.message?.toolCallList?.[0] ? {
        id: bodyJson.message.toolCallList[0].id,
        type: bodyJson.message.toolCallList[0].type,
        functionName: bodyJson.message.toolCallList[0].function?.name,
        hasArguments: !!bodyJson.message.toolCallList[0].arguments,
        hasParameters: !!bodyJson.message.toolCallList[0].function?.parameters,
      } : null,
    });

    // Extract from Vapi tool call - simplified to always use toolCallList[0]
    let toolCallId: string | undefined;
    let vapiArgs: any = {};
    let isVapiRequest = false;

    if (bodyJson?.message?.toolCallList?.[0]) {
      isVapiRequest = true;
      const toolCall = bodyJson.message.toolCallList[0];
      toolCallId = toolCall.id;
      vapiArgs = toolCall.arguments || toolCall.function?.parameters || {};

      logger.info("🤖 VAPI REQUEST CONFIRMED", {
        requestId,
        toolCallId: toolCallId,
        functionName: toolCall.function?.name,
        arguments: vapiArgs,
        argumentsKeys: Object.keys(vapiArgs),
        vapiMessageId: bodyJson.message?.id,
        toolCallCount: bodyJson.message?.toolCallList?.length || 0,
        fullToolCall: toolCall,
      });
    } else {
      logger.info("❌ NOT A VAPI REQUEST", {
        requestId,
        reason: bodyJson ? "No toolCallList found in message" : "No JSON body",
        hasJsonBody: !!bodyJson,
        hasMessage: !!bodyJson?.message,
      });
    }

    // 📋 QUERY PARAMETER PROCESSING 📋
    logger.info("📋 PROCESSING QUERY PARAMETERS", {
      requestId,
      isVapiRequest,
      toolCallId: toolCallId || 'none',
      hasVapiArgs: !!vapiArgs && Object.keys(vapiArgs).length > 0,
    });

    // Fallback: Extract from query parameters if no valid body
    if (!toolCallId) {
      const url = new URL(request.url);
      const query =
        url.searchParams.get("q") || url.searchParams.get("query") || "";
      const limit = url.searchParams.get("limit");
      const cursor = url.searchParams.get("cursor");

      logger.info("🔍 CHECKING QUERY PARAMETERS", {
        requestId,
        queryParam: query,
        limitParam: limit,
        cursorParam: cursor,
        hasAnyParams: !!(query || limit || cursor),
      });

      // Check if there's a message parameter with JSON
      const messageParam = url.searchParams.get("message");
      if (messageParam) {
        logger.info("📨 FOUND MESSAGE QUERY PARAMETER", {
          requestId,
          messageParamLength: messageParam.length,
          messageParamPreview: messageParam.substring(0, 100),
        });

        try {
          const decodedMessage = JSON.parse(decodeURIComponent(messageParam));
          logger.info("📨 DECODED MESSAGE PARAMETER", {
            requestId,
            decodedMessageKeys: Object.keys(decodedMessage),
            hasToolCallList: !!decodedMessage.toolCallList,
            toolCallListLength: decodedMessage.toolCallList?.length || 0,
          });

          if (decodedMessage.toolCallList && decodedMessage.toolCallList[0]) {
            const toolCall = decodedMessage.toolCallList[0];
            toolCallId = toolCall.id;
            vapiArgs = toolCall.arguments || toolCall.function?.parameters || {};

            logger.info("✅ VAPI DETECTED FROM QUERY PARAM", {
              requestId,
              toolCallId: toolCallId,
              functionName: toolCall.function?.name,
              arguments: vapiArgs,
              source: 'query-param-message',
            });
          }
        } catch (e) {
          logger.warn("❌ FAILED TO PARSE MESSAGE QUERY PARAM", {
            requestId,
            error: e instanceof Error ? e.message : String(e),
            rawMessageParam: messageParam.substring(0, 200),
          });
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

        logger.info("🔄 USING QUERY PARAMS FALLBACK", {
          requestId,
          toolCallId: toolCallId,
          query,
          limit: limit ? parseInt(limit) : undefined,
          cursor: cursor || undefined,
        });
      }
    }

    // 🎯 FINAL PARAMETER RESOLUTION 🎯
    const finalQuery = vapiArgs.q || "";
    const finalLimit = Math.min(parseInt(String(vapiArgs.limit ?? 5)), 50);
    const finalCursor = vapiArgs.cursor || null;

    logger.info("🎯 FINAL SEARCH PARAMETERS", {
      requestId,
      query: finalQuery,
      limit: finalLimit,
      cursor: finalCursor,
      toolCallId: toolCallId || 'none',
      isVapiRequest,
      source: toolCallId === "query-params-fallback" ? "query-params" : "vapi",
    });

    logger.debug("🔄 EXECUTING SHOPIFY REQUEST", {
      requestId,
      query: finalQuery,
      limit: finalLimit,
      cursor: finalCursor,
      isVapiRequest,
    });
    const response = await storefrontRequest(PRODUCT_SEARCH_QUERY, {
      query: finalQuery,
      first: finalLimit,
      after: finalCursor,
    });

    logger.info("🏪 SHOPIFY RESPONSE RECEIVED", {
      requestId,
      hasData: !!response?.data,
      hasProducts: !!response?.data?.products,
      productsCount: response?.data?.products?.edges?.length || 0,
      hasNextPage: response?.data?.products?.pageInfo?.hasNextPage,
      endCursor: response?.data?.products?.pageInfo?.endCursor,
    });

    if (!response?.data?.products) {
      logger.error("❌ SHOPIFY REQUEST FAILED", {
        requestId,
        response: response,
        error: "No products data in response",
      });

      const errorResult = JSON.stringify({ error: "Failed to fetch products" });

      logger.info("📤 SENDING ERROR RESPONSE", {
        requestId,
        toolCallId: toolCallId || "unknown",
        errorResult,
        responseFormat: "vapi",
      });

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

    logger.info("🔄 PRODUCT TRANSFORMATION COMPLETED", {
      requestId,
      rawProductCount: products.edges.length,
      transformedProductCount: transformedProducts.length,
      limitRequested: finalLimit,
      productsReturned: Math.min(transformedProducts.length, finalLimit),
    });

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
    logger.info("📦 BUILDING RESPONSE DATA", {
      requestId,
      resultDataKeys: Object.keys(resultData),
      totalFound: resultData.totalFound,
      productsInResponse: resultData.products.length,
      hasQuery: !!resultData.query,
    });

    const serialized = JSON.stringify(resultData);

    logger.info("📄 RESPONSE SERIALIZATION", {
      requestId,
      serializedLength: serialized.length,
      compressionRatio: serialized.length / JSON.stringify(resultData).length,
    });

    const responseData = {
      results: [{ toolCallId: toolCallId || "unknown", result: serialized }],
    };

    logger.info("🎯 FINAL RESPONSE STRUCTURE", {
      requestId,
      toolCallId: toolCallId || "unknown",
      resultType: typeof serialized,
      resultLength: serialized.length,
      responseFormat: "vapi",
      isVapiRequest,
    });

    const responseObj = NextResponse.json(responseData, {
      headers: corsHeaders(request.headers.get("origin") || undefined),
    });

    // 🎉 REQUEST COMPLETED SUCCESSFULLY 🎉
    const responseTime = Date.now() - startTime;
    logger.info("🎉 === REQUEST COMPLETED SUCCESSFULLY ===", {
      requestId,
      method: request.method,
      url: request.url,
      statusCode: 200,
      responseTime: `${responseTime}ms`,
      productsFound: transformedProducts.length,
      toolCallId: toolCallId || "unknown",
      isVapiRequest: isVapiRequest,
      responseFormat: "vapi",
      resultSize: serialized.length,
      processingTimeMs: responseTime,
    });

    return responseObj;
  } catch (error) {
    // 🚨 COMPREHENSIVE ERROR LOGGING 🚨
    const responseTime = Date.now() - startTime;

    logger.error("💥 === REQUEST FAILED WITH ERROR ===", {
      requestId,
      method: request.method,
      url: request.url,
      responseTime: `${responseTime}ms`,
      error: error instanceof Error ? error.message : String(error),
      errorType: error instanceof Error ? error.constructor.name : typeof error,
      stack: error instanceof Error ? error.stack : undefined,
      hasStack: error instanceof Error && !!error.stack,
    });

    // Extract toolCallId from request body for error response
    let errorToolCallId = "unknown";
    logger.info("🔍 EXTRACTING TOOL CALL ID FOR ERROR RESPONSE", {
      requestId,
      attemptingBodyParse: true,
    });

    try {
      const bodyText = await request.text();
      logger.debug("📄 ERROR RESPONSE: BODY TEXT CAPTURED", {
        requestId,
        bodyLength: bodyText.length,
        hasContent: bodyText.trim().length > 0,
      });

      if (bodyText.trim()) {
        const bodyJson = JSON.parse(bodyText);
        logger.debug("📄 ERROR RESPONSE: BODY PARSED", {
          requestId,
          hasMessage: !!bodyJson?.message,
          hasToolCallList: !!bodyJson?.message?.toolCallList,
          toolCallListLength: bodyJson?.message?.toolCallList?.length || 0,
        });

        if (bodyJson?.message?.toolCallList?.[0]) {
          errorToolCallId = bodyJson.message.toolCallList[0].id;
          logger.info("✅ ERROR RESPONSE: TOOL CALL ID EXTRACTED", {
            requestId,
            toolCallId: errorToolCallId,
            source: 'request-body',
          });
        } else {
          logger.info("❌ ERROR RESPONSE: NO TOOL CALL ID FOUND", {
            requestId,
            reason: "No toolCallList in message",
          });
        }
      } else {
        logger.info("📭 ERROR RESPONSE: EMPTY BODY", {
          requestId,
          note: "No body content to parse",
        });
      }
    } catch (parseError) {
      logger.warn("⚠️ ERROR RESPONSE: BODY PARSE FAILED", {
        requestId,
        parseError: parseError instanceof Error ? parseError.message : String(parseError),
        fallbackToolCallId: errorToolCallId,
      });
    }

    const errorResult = JSON.stringify({ error: "Internal server error" });
    const errorResponseData = {
      results: [{ toolCallId: errorToolCallId, result: errorResult }],
    };

    logger.info("📤 SENDING ERROR RESPONSE", {
      requestId,
      toolCallId: errorToolCallId,
      errorResult,
      responseFormat: "vapi",
      statusCode: 500,
    });

    const errorResponseObj = NextResponse.json(errorResponseData, {
      status: 500,
      headers: corsHeaders(request.headers.get("origin") || undefined),
    });

    logger.error("🚨 === ERROR RESPONSE SENT ===", {
      requestId,
      method: request.method,
      url: request.url,
      statusCode: 500,
      responseTime: `${responseTime}ms`,
      toolCallId: errorToolCallId,
      error: error instanceof Error ? error.message : String(error),
      processingTimeMs: responseTime,
    });

    return errorResponseObj;
  }
}

// POST method for advanced search with multiple filters
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  logger.info("🔍 Inventory search API called", { method: "POST" });

  try {
    // Try to read as JSON first (most common case for VAPI)
    let requestBody: any = null;
    let bodyJson = null;

    try {
      requestBody = await request.json();
      bodyJson = requestBody;
      logger.debug("📄 JSON body received", {
        bodyKeys: Object.keys(requestBody),
      });
    } catch (e) {
      // If JSON parsing fails, fall back to text
      logger.debug("📝 JSON parsing failed, trying text fallback");
      const bodyText = await request.text();
      logger.debug("📄 Text body received", { bodyLength: bodyText.length });

      try {
        requestBody = bodyText.trim() ? JSON.parse(bodyText) : null;
        bodyJson = requestBody;
        logger.debug("🔧 Parsed JSON from text", {
          bodyKeys: requestBody ? Object.keys(requestBody) : [],
        });
      } catch (parseError) {
        requestBody = bodyText; // Keep as string if JSON parsing fails
        bodyJson = null;
        logger.debug("📝 Using raw body text", { bodyLength: bodyText.length });
      }
    }

    logger.debug("📄 Raw request body received", { body: requestBody });

    // Detect Vapi tool-call wrapper per docs: https://docs.vapi.ai/tools/custom-tools#request-format-understanding-the-tool-call-request
    const vapiMessage = requestBody?.message;
    const vapiToolCall = Array.isArray(vapiMessage?.toolCallList)
      ? vapiMessage.toolCallList[0]
      : undefined;
    const isVapi = Boolean(vapiToolCall);
    const vapiArgs =
      vapiToolCall?.arguments || vapiToolCall?.function?.parameters || {};

    if (isVapi) {
      logger.info("🤖 VAPI POST Request Detected", {
        toolCallId: vapiToolCall.id,
        functionName: vapiToolCall.function?.name,
        arguments: vapiArgs,
        vapiMessageId: vapiMessage?.id,
        toolCallCount: vapiMessage?.toolCallList?.length || 0,
      });
    }

    // Single, simplified shape: only { q, limit? } — limit defaults to 5
    const body = (isVapi ? vapiArgs : requestBody) || {};
    const q = (body.q ?? "").toString();
    const limit = Math.min(Number(body.limit ?? 5), 50);
    const cursor = body.cursor ?? null;

    logger.debug("🔧 Processing search parameters", {
      query: q,
      limit,
      cursor,
      isVapi,
    });

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

      const responseTime = Date.now() - startTime;
      logger.info("✅ VAPI POST Response", {
        method: request.method,
        url: request.url,
        statusCode: 200,
        responseTime: `${responseTime}ms`,
        productsFound: transformedProducts.length,
        toolCallId: toolCallId,
        isVapiRequest: true,
        responseFormat: "vapi",
      });

      return NextResponse.json(responseData, {
        headers: corsHeaders(request.headers.get("origin") || undefined),
      });
    }

    const responseTime = Date.now() - startTime;
    logger.info("✅ POST Response", {
      method: request.method,
      url: request.url,
      statusCode: 200,
      responseTime: `${responseTime}ms`,
      productsFound: transformedProducts.length,
      isVapiRequest: false,
      responseFormat: "standard",
    });

    return NextResponse.json(payload, {
      headers: corsHeaders(request.headers.get("origin") || undefined),
    });
  } catch (error) {
    logger.error("❌ Error in POST search", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    // If request was from Vapi, return wrapped error
    try {
      const rawBody = await request.json();
      const vapiMessage = rawBody?.message;
      const vapiToolCall = Array.isArray(vapiMessage?.toolCallList)
        ? vapiMessage.toolCallList[0]
        : undefined;
      if (vapiToolCall) {
        const responseTime = Date.now() - startTime;
        logger.error("❌ VAPI POST Error Response", {
          method: request.method,
          url: request.url,
          statusCode: 500,
          responseTime: `${responseTime}ms`,
          toolCallId: vapiToolCall.id,
          error: error instanceof Error ? error.message : String(error),
        });

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

    const responseTime = Date.now() - startTime;
    logger.error("❌ POST Error Response", {
      method: request.method,
      url: request.url,
      statusCode: 500,
      responseTime: `${responseTime}ms`,
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
