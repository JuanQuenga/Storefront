import { NextRequest, NextResponse } from "next/server";
import { corsHeaders } from "@/lib/cors";
import { storefrontRequest, PRODUCT_SEARCH_QUERY } from "@/lib/shopify";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") || "";
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50); // Max 50 items
    const cursor = searchParams.get("cursor");
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

    // Add filters
    const filters = [];
    if (productType) filters.push(`product_type:${productType}`);
    if (vendor) filters.push(`vendor:${vendor}`);
    if (tag) filters.push(`tag:${tag}`);
    if (minPrice) filters.push(`price:>=${minPrice}`);
    if (maxPrice) filters.push(`price:<=${maxPrice}`);
    // inventory_quantity filter isn't supported in Storefront tokenless; use available_for_sale only
    // If needed, we can filter client-side based on variant availability
    if (availableForSale !== undefined) {
      filters.push(`available_for_sale:${availableForSale}`);
    }

    if (filters.length > 0) {
      searchQuery = `${query} ${filters.join(" ")}`.trim();
    }

    // Execute GraphQL query
    const response = await storefrontRequest(PRODUCT_SEARCH_QUERY, {
      query: searchQuery,
      first: limit,
      after: cursor || null,
    });

    if (!response?.data?.products) {
      return NextResponse.json(
        { error: "Failed to fetch products" },
        { status: 500 }
      );
    }

    const { products } = response.data;

    // Transform the response to a more user-friendly format
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

    // Merge simple + advanced + vapi arguments
    const body = { ...(rawBody || {}), ...(isVapi ? vapiArgs : {}) } as any;

    // Support two shapes:
    // 1) Advanced: { query, filters, pagination, sort }
    // 2) Simple: { q, limit, cursor, product_type, vendor, tag, min_price, max_price, in_stock, available }
    const {
      query: advQuery,
      filters: advFilters = {},
      pagination: advPagination = {},
      sort = "RELEVANCE",
    } = body || {};

    const q = body?.q ?? "";
    const productType = advFilters.productType ?? body?.product_type;
    const vendor = advFilters.vendor ?? body?.vendor;
    const tag = advFilters.tag ?? body?.tag;
    const minPrice = advFilters.minPrice ?? body?.min_price;
    const maxPrice = advFilters.maxPrice ?? body?.max_price;
    const availableForSale = advFilters.availableForSale ?? body?.available;
    // Note: in_stock cannot be expressed in tokenless search filters; omit server-side

    const limit = Math.min(
      Number(advPagination.limit ?? body?.limit ?? 20),
      50
    );
    const cursor = (advPagination.cursor ?? body?.cursor) || null;

    const filterParts: string[] = [];
    if (productType) filterParts.push(`product_type:${productType}`);
    if (vendor) filterParts.push(`vendor:${vendor}`);
    if (tag) filterParts.push(`tag:${tag}`);
    if (minPrice) filterParts.push(`price:>=${minPrice}`);
    if (maxPrice) filterParts.push(`price:<=${maxPrice}`);
    if (availableForSale !== undefined) {
      filterParts.push(`available_for_sale:${availableForSale}`);
    }

    const baseQuery = (advQuery ?? q ?? "").toString();
    let searchQuery = baseQuery;
    if (filterParts.length > 0) {
      searchQuery = `${baseQuery} ${filterParts.join(" ")}`.trim();
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
