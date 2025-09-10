import { NextRequest, NextResponse } from "next/server";
import { corsHeaders } from "@/lib/cors";
import { storefrontRequest, COLLECTIONS_QUERY } from "@/lib/shopify";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);
    const cursor = searchParams.get("cursor");
    const includeProducts = searchParams.get("include_products") === "true";

    const response = await storefrontRequest(COLLECTIONS_QUERY, {
      first: limit,
      after: cursor || null,
    });

    if (!response?.data?.collections) {
      return NextResponse.json(
        { error: "Failed to fetch collections" },
        { status: 500 }
      );
    }

    const { collections } = response.data;

    // Transform collections
    const transformedCollections = collections.edges.map(
      ({ node }: { node: any }) => {
        const collection = {
          id: node.id,
          title: node.title,
          handle: node.handle,
          description: node.description,
        };

        // Include products if requested
        if (includeProducts) {
          (collection as any).products = node.products.edges.map(
            ({ node: product }: { node: any }) => ({
              id: product.id,
              title: product.title,
              handle: product.handle,
              priceRange: {
                min: product.priceRange.minVariantPrice.amount,
                max: product.priceRange.minVariantPrice.amount,
                currency: product.priceRange.minVariantPrice.currencyCode,
              },
              inventory: product.variants.edges[0]?.node
                ? {
                    quantity: product.variants.edges[0].node.quantityAvailable,
                    availableForSale:
                      product.variants.edges[0].node.availableForSale,
                  }
                : null,
              image: product.images.edges[0]?.node
                ? {
                    url: product.images.edges[0].node.url,
                    altText: product.images.edges[0].node.altText,
                  }
                : null,
            })
          );
        }

        return collection;
      }
    );

    return NextResponse.json(
      {
        collections: transformedCollections,
        pagination: {
          hasNextPage: collections.pageInfo.hasNextPage,
          endCursor: collections.pageInfo.endCursor,
          totalCount: transformedCollections.length,
        },
      },
      { headers: corsHeaders(request.headers.get("origin") || undefined) }
    );
  } catch (error) {
    console.error("Error fetching collections:", error);
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
