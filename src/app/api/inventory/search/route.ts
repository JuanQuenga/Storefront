import { NextRequest, NextResponse } from "next/server";
import { corsHeaders } from "@/lib/cors";
import { storefrontRequest, PRODUCT_SEARCH_QUERY } from "@/lib/shopify";
import { logger } from "@/lib/server-logger";

export async function GET(request: NextRequest) {
  // Log raw incoming request
  logger.info("Raw incoming GET request", {
    method: request.method,
    url: request.url,
    headers: Object.fromEntries(request.headers.entries()),
  });

  try {
    // Extract parameters from URL query string
    const url = new URL(request.url);
    const query =
      url.searchParams.get("q") || url.searchParams.get("query") || "";
    const limit = url.searchParams.get("limit");
    const cursor = url.searchParams.get("cursor");

    // Final parameter resolution
    const finalQuery = query;
    const finalLimit = Math.min(parseInt(String(limit ?? 5)), 50);
    const finalCursor = cursor || null;
    const response = await storefrontRequest(PRODUCT_SEARCH_QUERY, {
      query: finalQuery,
      first: finalLimit,
      after: finalCursor,
    });

    if (!response?.data?.products) {
      return NextResponse.json(
        { error: "Failed to fetch products" },
        {
          status: 500,
          headers: corsHeaders(request.headers.get("origin") || undefined),
        }
      );
    }

    const { products } = response.data;

    // Log raw products data for debugging
    logger.info("Raw products data", {
      productsCount: products.edges.length,
      firstProduct: products.edges[0]?.node || null,
    });

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
          description: node.descriptionHtml,
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

    // Log transformed products for debugging
    logger.info("Transformed products", {
      transformedCount: transformedProducts.length,
      firstTransformed: transformedProducts[0] || null,
    });

    // Create customer-friendly product data
    const customerProducts = transformedProducts
      .slice(0, finalLimit)
      .map((p: any) => {
        // Extract condition from descriptionHtml
        let condition = "Unknown";
        if (p.descriptionHtml) {
          // Look for table rows with condition information
          const conditionMatch = p.descriptionHtml.match(
            /<tr[^>]*>.*?<td[^>]*>.*?condition.*?<\/td>.*?<td[^>]*>(.*?)<\/td>.*?<\/tr>/i
          );
          if (conditionMatch) {
            condition = conditionMatch[1].replace(/<[^>]*>/g, "").trim();
          }
        }

        return {
          name: p.title,
          price: `$${p.priceRange.min}`,
          condition: condition,
          sku: p.variants[0]?.sku || "N/A",
          inStock: p.inStock ? "Yes" : "No",
        };
      });

    // Create serialized string response for AI
    let responseString = "";

    if (customerProducts.length === 0) {
      responseString = `No products found for "${finalQuery}". Please try a different search term.`;
    } else {
      responseString = `Found ${customerProducts.length} product${
        customerProducts.length === 1 ? "" : "s"
      } for "${finalQuery}":\n\n`;

      customerProducts.forEach((product: any, index: number) => {
        responseString += `${index + 1}. ${product.name}\n`;
        responseString += `   Price: ${product.price}\n`;
        responseString += `   Condition: ${product.condition}\n`;
        responseString += `   SKU: ${product.sku}\n`;
        responseString += `   In Stock: ${product.inStock}\n\n`;
      });
    }

    // Log the response
    logger.info("API response", {
      query: finalQuery,
      totalFound: customerProducts.length,
      responseString: responseString,
    });

    // Return only the serialized string as plain text
    return new NextResponse(responseString, {
      status: 200,
      headers: {
        ...corsHeaders(request.headers.get("origin") || undefined),
        'Content-Type': 'text/plain; charset=utf-8',
      },
    });
  } catch (error) {
    logger.error("Request failed", {
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
    let requestBody: any = {};

    if (rawBody.trim().length > 0) {
      try {
        requestBody = JSON.parse(rawBody);
      } catch (jsonError) {
        // If JSON parsing fails, treat as empty object
        requestBody = {};
      }
    }

    // Extract parameters from VAPI tool call format
    let q = "";
    let limit = 5;
    let cursor = null;

    // Check if this is a VAPI tool call
    if (requestBody.message?.toolCallList?.[0]) {
      const toolCall = requestBody.message.toolCallList[0];
      const args = toolCall.function?.arguments || {};
      q = (args.q ?? "").toString();
      limit = Math.min(Number(args.limit ?? 5), 50);
      cursor = args.cursor ?? null;
    } else {
      // Fallback to direct body parameters
      q = (requestBody.q ?? "").toString();
      limit = Math.min(Number(requestBody.limit ?? 5), 50);
      cursor = requestBody.cursor ?? null;
    }

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
        description: node.descriptionHtml,
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

    // Create customer-friendly product data
    const customerProducts = transformedProducts.map((p: any) => {
      // Extract condition from descriptionHtml
      let condition = "Unknown";
      if (p.descriptionHtml) {
        // Look for table rows with condition information
        const conditionMatch = p.descriptionHtml.match(
          /<tr[^>]*>.*?<td[^>]*>.*?condition.*?<\/td>.*?<td[^>]*>(.*?)<\/td>.*?<\/tr>/i
        );
        if (conditionMatch) {
          condition = conditionMatch[1].replace(/<[^>]*>/g, "").trim();
        }
      }

      return {
        name: p.title,
        price: `$${p.priceRange.min}`,
        condition: condition,
        sku: p.variants[0]?.sku || "N/A",
        inStock: p.inStock ? "Yes" : "No",
      };
    });

    // Create serialized string response for AI
    let responseString = "";

    if (customerProducts.length === 0) {
      responseString = `No products found for "${q}". Please try a different search term.`;
    } else {
      responseString = `Found ${customerProducts.length} product${
        customerProducts.length === 1 ? "" : "s"
      } for "${q}":\n\n`;

      customerProducts.forEach((product: any, index: number) => {
        responseString += `${index + 1}. ${product.name}\n`;
        responseString += `   Price: ${product.price}\n`;
        responseString += `   Condition: ${product.condition}\n`;
        responseString += `   SKU: ${product.sku}\n`;
        responseString += `   In Stock: ${product.inStock}\n\n`;
      });
    }

    // Log the response
    logger.info("API POST response", {
      query: q,
      totalFound: customerProducts.length,
      responseString: responseString,
    });

    // Return only the serialized string as plain text
    return new NextResponse(responseString, {
      status: 200,
      headers: {
        ...corsHeaders(request.headers.get("origin") || undefined),
        'Content-Type': 'text/plain; charset=utf-8',
      },
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
