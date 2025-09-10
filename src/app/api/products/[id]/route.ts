import { NextRequest, NextResponse } from "next/server";
import { storefrontRequest, PRODUCT_BY_ID_QUERY } from "@/lib/shopify";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const productId = resolvedParams.id;

    if (!productId) {
      return NextResponse.json(
        { error: "Product ID is required" },
        { status: 400 }
      );
    }

    // Ensure the ID is in the correct Shopify format (gid://shopify/Product/...)
    let formattedId = productId;
    if (!productId.startsWith("gid://")) {
      formattedId = `gid://shopify/Product/${productId}`;
    }

    const response = await storefrontRequest(PRODUCT_BY_ID_QUERY, {
      id: formattedId,
    });

    if (!response?.data?.product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const product = response.data.product;

    // Transform the response
    const transformedProduct = {
      id: product.id,
      title: product.title,
      handle: product.handle,
      description: product.description,
      productType: product.productType,
      vendor: product.vendor,
      priceRange: {
        min: product.priceRange.minVariantPrice.amount,
        max: product.priceRange.maxVariantPrice.amount,
        currency: product.priceRange.minVariantPrice.currencyCode,
      },
      variants: product.variants.edges.map(
        ({ node: variant }: { node: any }) => ({
          id: variant.id,
          title: variant.title,
          sku: variant.sku,
          price: variant.price.amount,
          compareAtPrice: variant.compareAtPrice?.amount || null,
          inventoryQuantity: variant.inventoryQuantity,
          availableForSale: variant.availableForSale,
          weight: variant.weight,
          weightUnit: variant.weightUnit,
          options: variant.selectedOptions,
        })
      ),
      images: product.images.edges.map(({ node: image }: { node: any }) => ({
        url: image.url,
        altText: image.altText,
        width: image.width,
        height: image.height,
      })),
      collections: product.collections.edges.map(
        ({ node: collection }: { node: any }) => ({
          id: collection.id,
          title: collection.title,
          handle: collection.handle,
        })
      ),
      totalVariants: product.variants.edges.length,
      inStock: product.variants.edges.some(
        ({ node }: { node: any }) => node.inventoryQuantity > 0
      ),
    };

    return NextResponse.json(transformedProduct);
  } catch (error) {
    console.error("Error fetching product:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
