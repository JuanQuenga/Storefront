// Shopify API Types
export interface ShopifyProduct {
  id: string;
  title: string;
  handle: string;
  description: string;
  productType: string;
  tags: string[];
  vendor: string;
  priceRange: {
    minVariantPrice: {
      amount: string;
      currencyCode: string;
    };
    maxVariantPrice: {
      amount: string;
      currencyCode: string;
    };
  };
  variants: {
    edges: Array<{
      node: ShopifyProductVariant;
    }>;
  };
  images: {
    edges: Array<{
      node: ShopifyProductImage;
    }>;
  };
  collections?: {
    edges: Array<{
      node: ShopifyCollection;
    }>;
  };
}

export interface ShopifyProductVariant {
  id: string;
  title: string;
  sku: string;
  price: {
    amount: string;
    currencyCode: string;
  };
  compareAtPrice?: {
    amount: string;
    currencyCode: string;
  };
  inventoryQuantity: number;
  availableForSale: boolean;
  weight?: number;
  weightUnit?: string;
  selectedOptions: Array<{
    name: string;
    value: string;
  }>;
  product?: {
    title: string;
    handle: string;
  };
}

export interface ShopifyProductImage {
  url: string;
  altText?: string;
  width?: number;
  height?: number;
}

export interface ShopifyCollection {
  id: string;
  title: string;
  handle: string;
  description?: string;
  products?: {
    edges: Array<{
      node: ShopifyProduct;
    }>;
  };
}

export interface ShopifyResponse<T = any> {
  data: T;
  errors?: Array<{
    message: string;
    locations?: Array<{
      line: number;
      column: number;
    }>;
    path?: string[];
  }>;
}
