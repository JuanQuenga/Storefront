import { NextRequest, NextResponse } from "next/server";
import { corsHeaders } from "@/lib/cors";
import { storefrontRequest, INVENTORY_QUERY } from "@/lib/shopify";
import { logger } from "@/lib/server-logger";

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  logger.info("🔍 Inventory check API called", { method: "GET" });

  let toolCallId: string | undefined;
  let isVapiRequest = false;

  try {
    // Check for VAPI request format in body - try JSON first
    let requestBody: any = null;

    try {
      // Try to read as JSON first (most common case for VAPI)
      requestBody = await request.json();
      logger.debug("📄 JSON body received", {
        bodyKeys: Object.keys(requestBody),
      });

      if (requestBody?.message?.toolCallList?.[0]) {
        isVapiRequest = true;
        const toolCall = requestBody.message.toolCallList[0];
        toolCallId = toolCall.id;

        logger.info("🤖 VAPI Inventory Check Request Detected", {
          toolCallId: toolCallId,
          functionName: toolCall.function?.name,
          vapiMessageId: requestBody.message?.id,
        });
      }
    } catch (e) {
      // If JSON parsing fails, fall back to text
      logger.debug("📝 JSON parsing failed, trying text fallback");
      const bodyText = await request.text();
      logger.debug("📄 Text body received", { bodyLength: bodyText.length });

      try {
        requestBody = bodyText.trim() ? JSON.parse(bodyText) : null;
        if (requestBody?.message?.toolCallList?.[0]) {
          isVapiRequest = true;
          const toolCall = requestBody.message.toolCallList[0];
          toolCallId = toolCall.id;

          logger.info("🤖 VAPI Inventory Check Request Detected", {
            toolCallId: toolCallId,
            functionName: toolCall.function?.name,
            vapiMessageId: requestBody.message?.id,
          });
        }
      } catch (parseError) {
        // Not a JSON body, continue with query params
        requestBody = bodyText;
      }
    }

    const { searchParams } = new URL(request.url);
    const ids = searchParams.get("ids");

    if (!ids) {
      logger.warn("❌ Missing variant IDs in request", {
        url: request.url,
        isVapiRequest,
      });
      if (isVapiRequest && toolCallId) {
        return NextResponse.json(
          {
            results: [
              {
                toolCallId: toolCallId,
                result: { error: "Variant IDs are required" },
              },
            ],
          },
          {
            status: 400,
            headers: corsHeaders(request.headers.get("origin") || undefined),
          }
        );
      }
      return NextResponse.json(
        { error: "Variant IDs are required" },
        { status: 400 }
      );
    }

    // Parse and validate IDs
    const variantIds = ids
      .split(",")
      .map((id) => id.trim())
      .filter((id) => id);

    if (variantIds.length === 0) {
      logger.warn("❌ No valid variant IDs provided", { ids });
      if (isVapiRequest && toolCallId) {
        return NextResponse.json(
          {
            results: [
              {
                toolCallId: toolCallId,
                result: { error: "At least one valid variant ID is required" },
              },
            ],
          },
          {
            status: 400,
            headers: corsHeaders(request.headers.get("origin") || undefined),
          }
        );
      }
      return NextResponse.json(
        { error: "At least one valid variant ID is required" },
        { status: 400 }
      );
    }

    // Format IDs for Shopify
    const formattedIds = variantIds.map((id) =>
      id.startsWith("gid://") ? id : `gid://shopify/ProductVariant/${id}`
    );

    logger.debug("🔧 Making Shopify inventory request", {
      variantCount: formattedIds.length,
      isVapiRequest,
    });

    const response = await storefrontRequest(INVENTORY_QUERY, {
      ids: formattedIds,
    });

    if (!response?.data?.nodes) {
      logger.error("Failed to fetch inventory data from Shopify", { response });
      if (isVapiRequest && toolCallId) {
        return NextResponse.json(
          {
            results: [
              {
                toolCallId: toolCallId,
                result: { error: "Failed to fetch inventory data" },
              },
            ],
          },
          {
            status: 500,
            headers: corsHeaders(request.headers.get("origin") || undefined),
          }
        );
      }
      return NextResponse.json(
        { error: "Failed to fetch inventory data" },
        { status: 500 }
      );
    }

    const inventoryData = response.data.nodes.map(
      (node: {
        id: string;
        sku: string;
        title: string;
        quantityAvailable: number;
        availableForSale: boolean;
        price: { amount: string; currencyCode: string };
        product: { title: string; handle: string };
      }) => ({
        id: node.id,
        sku: node.sku,
        title: node.title,
        inventoryQuantity: node.quantityAvailable,
        availableForSale: node.availableForSale,
        price: node.price.amount,
        currency: node.price.currencyCode,
        product: {
          title: node.product.title,
          handle: node.product.handle,
        },
      })
    );

    const responseTime = Date.now() - startTime;

    const inventoryResult = {
      inventory: inventoryData,
      summary: {
        totalVariants: inventoryData.length,
        inStock: inventoryData.filter((item: any) => item.inventoryQuantity > 0)
          .length,
        outOfStock: inventoryData.filter(
          (item: any) => item.inventoryQuantity === 0
        ).length,
        lowStock: inventoryData.filter(
          (item: any) =>
            item.inventoryQuantity > 0 && item.inventoryQuantity <= 5
        ).length,
      },
    };

    // Return VAPI format if this was a VAPI request
    if (isVapiRequest && toolCallId) {
      const vapiResponse = {
        results: [
          {
            toolCallId: toolCallId,
            result: inventoryResult,
          },
        ],
      };

      logger.info("✅ VAPI Inventory Check Response", {
        method: request.method,
        url: request.url,
        statusCode: 200,
        responseTime: `${responseTime}ms`,
        inventoryCount: inventoryData.length,
        toolCallId: toolCallId,
        isVapiRequest: true,
        responseFormat: "vapi",
      });

      return NextResponse.json(vapiResponse, {
        headers: corsHeaders(request.headers.get("origin") || undefined),
      });
    }

    logger.info("✅ Inventory Check Response", {
      method: request.method,
      url: request.url,
      statusCode: 200,
      responseTime: `${responseTime}ms`,
      inventoryCount: inventoryData.length,
      isVapiRequest: false,
      responseFormat: "standard",
    });

    return NextResponse.json(inventoryResult, {
      headers: corsHeaders(request.headers.get("origin") || undefined),
    });
  } catch (error) {
    logger.error("❌ Error checking inventory", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    // Return VAPI format if this was a VAPI request
    if (isVapiRequest && toolCallId) {
      const responseTime = Date.now() - startTime;
      logger.error("❌ VAPI Inventory Check Error Response", {
        method: request.method,
        url: request.url,
        statusCode: 500,
        responseTime: `${responseTime}ms`,
        toolCallId: toolCallId,
        error: error instanceof Error ? error.message : String(error),
      });

      return NextResponse.json(
        {
          results: [
            {
              toolCallId: toolCallId,
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

    return NextResponse.json(
      { error: "Internal server error" },
      {
        status: 500,
        headers: corsHeaders(request.headers.get("origin") || undefined),
      }
    );
  }
}

// POST method for VAPI requests
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  logger.info("🔍 Inventory check API called", { method: "POST" });

  let toolCallId: string | undefined;
  let isVapiRequest = false;

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

    logger.debug("📄 Raw POST request body received", { body: requestBody });

    // Detect Vapi tool-call wrapper
    const vapiMessage = requestBody?.message;
    const vapiToolCall = Array.isArray(vapiMessage?.toolCallList)
      ? vapiMessage.toolCallList[0]
      : undefined;

    if (vapiToolCall) {
      isVapiRequest = true;
      toolCallId = vapiToolCall.id;

      logger.info("🤖 VAPI POST Inventory Check Request Detected", {
        toolCallId: toolCallId,
        functionName: vapiToolCall.function?.name,
        vapiMessageId: vapiMessage?.id,
      });
    }

    // Extract parameters from VAPI arguments
    const args = vapiToolCall?.arguments || requestBody;
    const ids = args?.ids;

    if (!ids) {
      logger.warn("❌ Missing variant IDs in POST request", { isVapiRequest });

      if (isVapiRequest && toolCallId) {
        return NextResponse.json(
          {
            results: [
              {
                toolCallId: toolCallId,
                result: { error: "Variant IDs are required" },
              },
            ],
          },
          {
            status: 400,
            headers: corsHeaders(request.headers.get("origin") || undefined),
          }
        );
      }

      return NextResponse.json(
        { error: "Variant IDs are required" },
        { status: 400 }
      );
    }

    // Parse and validate IDs
    const variantIds = ids
      .split(",")
      .map((id: string) => id.trim())
      .filter((id: string) => id);

    if (variantIds.length === 0) {
      logger.warn("❌ No valid variant IDs provided", { ids });

      if (isVapiRequest && toolCallId) {
        return NextResponse.json(
          {
            results: [
              {
                toolCallId: toolCallId,
                result: { error: "At least one valid variant ID is required" },
              },
            ],
          },
          {
            status: 400,
            headers: corsHeaders(request.headers.get("origin") || undefined),
          }
        );
      }

      return NextResponse.json(
        { error: "At least one valid variant ID is required" },
        { status: 400 }
      );
    }

    // Format IDs for Shopify
    const formattedIds = variantIds.map((id: string) =>
      id.startsWith("gid://") ? id : `gid://shopify/ProductVariant/${id}`
    );

    logger.debug("🔧 Making Shopify inventory request", {
      variantCount: formattedIds.length,
      isVapiRequest,
    });

    const response = await storefrontRequest(INVENTORY_QUERY, {
      ids: formattedIds,
    });

    if (!response?.data?.nodes) {
      logger.error("Failed to fetch inventory data from Shopify", { response });

      if (isVapiRequest && toolCallId) {
        return NextResponse.json(
          {
            results: [
              {
                toolCallId: toolCallId,
                result: { error: "Failed to fetch inventory data" },
              },
            ],
          },
          {
            status: 500,
            headers: corsHeaders(request.headers.get("origin") || undefined),
          }
        );
      }

      return NextResponse.json(
        { error: "Failed to fetch inventory data" },
        { status: 500 }
      );
    }

    const inventoryData = response.data.nodes.map(
      (node: {
        id: string;
        sku: string;
        title: string;
        quantityAvailable: number;
        availableForSale: boolean;
        price: { amount: string; currencyCode: string };
        product: { title: string; handle: string };
      }) => ({
        id: node.id,
        sku: node.sku,
        title: node.title,
        inventoryQuantity: node.quantityAvailable,
        availableForSale: node.availableForSale,
        price: node.price.amount,
        currency: node.price.currencyCode,
        product: {
          title: node.product.title,
          handle: node.product.handle,
        },
      })
    );

    const responseTime = Date.now() - startTime;

    const inventoryResult = {
      inventory: inventoryData,
      summary: {
        totalVariants: inventoryData.length,
        inStock: inventoryData.filter((item: any) => item.inventoryQuantity > 0)
          .length,
        outOfStock: inventoryData.filter(
          (item: any) => item.inventoryQuantity === 0
        ).length,
        lowStock: inventoryData.filter(
          (item: any) =>
            item.inventoryQuantity > 0 && item.inventoryQuantity <= 5
        ).length,
      },
    };

    // Return VAPI format if this was a VAPI request
    if (isVapiRequest && toolCallId) {
      const vapiResponse = {
        results: [
          {
            toolCallId: toolCallId,
            result: inventoryResult,
          },
        ],
      };

      logger.info("✅ VAPI POST Inventory Check Response", {
        method: request.method,
        url: request.url,
        statusCode: 200,
        responseTime: `${responseTime}ms`,
        inventoryCount: inventoryData.length,
        toolCallId: toolCallId,
        isVapiRequest: true,
        responseFormat: "vapi",
      });

      return NextResponse.json(vapiResponse, {
        headers: corsHeaders(request.headers.get("origin") || undefined),
      });
    }

    logger.info("✅ POST Inventory Check Response", {
      method: request.method,
      url: request.url,
      statusCode: 200,
      responseTime: `${responseTime}ms`,
      inventoryCount: inventoryData.length,
      isVapiRequest: false,
      responseFormat: "standard",
    });

    return NextResponse.json(inventoryResult, {
      headers: corsHeaders(request.headers.get("origin") || undefined),
    });
  } catch (error) {
    logger.error("❌ Error in POST inventory check", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    // Return VAPI format if this was a VAPI request
    if (isVapiRequest && toolCallId) {
      const responseTime = Date.now() - startTime;
      logger.error("❌ VAPI POST Inventory Check Error Response", {
        method: request.method,
        url: request.url,
        statusCode: 500,
        responseTime: `${responseTime}ms`,
        toolCallId: toolCallId,
        error: error instanceof Error ? error.message : String(error),
      });

      return NextResponse.json(
        {
          results: [
            {
              toolCallId: toolCallId,
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
