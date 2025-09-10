import { NextRequest, NextResponse } from "next/server";
import { shopifyClient, INVENTORY_QUERY } from "@/lib/shopify";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const ids = searchParams.get("ids");

    if (!ids) {
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
      return NextResponse.json(
        { error: "At least one valid variant ID is required" },
        { status: 400 }
      );
    }

    // Format IDs for Shopify
    const formattedIds = variantIds.map((id) =>
      id.startsWith("gid://") ? id : `gid://shopify/ProductVariant/${id}`
    );

    const response = await (shopifyClient as any).request(INVENTORY_QUERY, {
      ids: formattedIds,
    });

    if (!response?.data?.nodes) {
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
        inventoryQuantity: number;
        availableForSale: boolean;
        price: { amount: string; currencyCode: string };
        product: { title: string; handle: string };
      }) => ({
        id: node.id,
        sku: node.sku,
        title: node.title,
        inventoryQuantity: node.inventoryQuantity,
        availableForSale: node.availableForSale,
        price: node.price.amount,
        currency: node.price.currencyCode,
        product: {
          title: node.product.title,
          handle: node.product.handle,
        },
      })
    );

    return NextResponse.json({
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
    });
  } catch (error) {
    console.error("Error checking inventory:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST method for batch inventory checking
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { variantIds } = body;

    if (!variantIds || !Array.isArray(variantIds) || variantIds.length === 0) {
      return NextResponse.json(
        { error: "variantIds array is required" },
        { status: 400 }
      );
    }

    if (variantIds.length > 50) {
      return NextResponse.json(
        { error: "Maximum 50 variants can be checked at once" },
        { status: 400 }
      );
    }

    // Format IDs for Shopify
    const formattedIds = variantIds.map((id: string) =>
      id.startsWith("gid://") ? id : `gid://shopify/ProductVariant/${id}`
    );

    const response = await (shopifyClient as any).request(INVENTORY_QUERY, {
      ids: formattedIds,
    });

    if (!response?.data?.nodes) {
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
        inventoryQuantity: number;
        availableForSale: boolean;
        price: { amount: string; currencyCode: string };
        product: { title: string; handle: string };
      }) => ({
        id: node.id,
        sku: node.sku,
        title: node.title,
        inventoryQuantity: node.inventoryQuantity,
        availableForSale: node.availableForSale,
        price: node.price.amount,
        currency: node.price.currencyCode,
        product: {
          title: node.product.title,
          handle: node.product.handle,
        },
      })
    );

    return NextResponse.json({
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
    });
  } catch (error) {
    console.error("Error in batch inventory check:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
