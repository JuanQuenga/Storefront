import { NextRequest, NextResponse } from "next/server";
import { getShopifyClient, PRODUCT_SEARCH_QUERY } from "@/lib/shopify";

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
    if (inStock) filters.push("inventory_quantity:>0");
    if (availableForSale !== undefined) {
      filters.push(`available_for_sale:${availableForSale}`);
    }

    if (filters.length > 0) {
      searchQuery = `${query} ${filters.join(" ")}`.trim();
    }

    // Execute GraphQL query
    const response = await (getShopifyClient() as any).request(
      PRODUCT_SEARCH_QUERY,
      {
        query: searchQuery,
        first: limit,
        after: cursor || null,
      }
    );

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
            inventoryQuantity: variant.inventoryQuantity,
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

    return NextResponse.json({
      products: transformedProducts,
      pagination: {
        hasNextPage: products.pageInfo.hasNextPage,
        endCursor: products.pageInfo.endCursor,
        totalCount: transformedProducts.length,
      },
    });
  } catch (error) {
    console.error("Error searching products:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST method for advanced search with multiple filters
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      query = "",
      filters = {},
      pagination = {},
      sort = "RELEVANCE",
    } = body;

    const limit = Math.min(pagination.limit || 20, 50);
    const cursor = pagination.cursor;

    // Build advanced search query
    let searchQuery = query;

    const filterParts = [];
    if (filters.productType)
      filterParts.push(`product_type:${filters.productType}`);
    if (filters.vendor) filterParts.push(`vendor:${filters.vendor}`);
    if (filters.tag) filterParts.push(`tag:${filters.tag}`);
    if (filters.minPrice) filterParts.push(`price:>=${filters.minPrice}`);
    if (filters.maxPrice) filterParts.push(`price:<=${filters.maxPrice}`);
    if (filters.inStock) filterParts.push("inventory_quantity:>0");
    if (filters.availableForSale !== undefined) {
      filterParts.push(`available_for_sale:${filters.availableForSale}`);
    }

    if (filterParts.length > 0) {
      searchQuery = `${query} ${filterParts.join(" ")}`.trim();
    }

    const response = await (getShopifyClient() as any).request(
      PRODUCT_SEARCH_QUERY,
      {
        query: searchQuery,
        first: limit,
        after: cursor || null,
      }
    );

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
            inventoryQuantity: variant.inventoryQuantity,
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

    return NextResponse.json({
      products: transformedProducts,
      pagination: {
        hasNextPage: products.pageInfo.hasNextPage,
        endCursor: products.pageInfo.endCursor,
        totalCount: transformedProducts.length,
      },
    });
  } catch (error) {
    console.error("Error in advanced search:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
