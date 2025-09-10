import { createStorefrontApiClient } from "@shopify/storefront-api-client";
import { env } from "./env";

// Initialize the Storefront API client with tokenless access
// Using a dummy token to satisfy the client library - actual requests will be tokenless
export const shopifyClient = createStorefrontApiClient({
  storeDomain: env.SHOPIFY_STORE_DOMAIN,
  apiVersion: env.SHOPIFY_API_VERSION,
  publicAccessToken: "dummy-token-for-tokenless-access", // Dummy token for client compatibility
} as any);

// Function to get the client (always available since validation happens at startup)
export function getShopifyClient() {
  return shopifyClient;
}

// GraphQL queries for tokenless access (keeping as strings for Shopify client compatibility)
// Note: Product tags require token-based authentication, so they're excluded from tokenless queries
export const PRODUCT_SEARCH_QUERY = `
  query ProductSearch($query: String!, $first: Int!, $after: String) {
    products(query: $query, first: $first, after: $after) {
      edges {
        node {
          id
          title
          handle
          description
          productType
          vendor
          priceRange {
            minVariantPrice {
              amount
              currencyCode
            }
            maxVariantPrice {
              amount
              currencyCode
            }
          }
          variants(first: 10) {
            edges {
              node {
                id
                title
                sku
                price {
                  amount
                  currencyCode
                }
                compareAtPrice {
                  amount
                  currencyCode
                }
                inventoryQuantity
                availableForSale
                selectedOptions {
                  name
                  value
                }
              }
            }
          }
          images(first: 5) {
            edges {
              node {
                url
                altText
              }
            }
          }
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

export const PRODUCT_BY_ID_QUERY = `
  query ProductById($id: ID!) {
    product(id: $id) {
      id
      title
      handle
      description
      productType
      vendor
      priceRange {
        minVariantPrice {
          amount
          currencyCode
        }
        maxVariantPrice {
          amount
          currencyCode
        }
      }
      variants(first: 50) {
        edges {
          node {
            id
            title
            sku
            price {
              amount
              currencyCode
            }
            compareAtPrice {
              amount
              currencyCode
            }
            inventoryQuantity
            availableForSale
            weight
            weightUnit
            selectedOptions {
              name
              value
            }
          }
        }
      }
      images(first: 10) {
        edges {
          node {
            url
            altText
            width
            height
          }
        }
      }
      collections(first: 5) {
        edges {
          node {
            id
            title
            handle
          }
        }
      }
    }
  }
`;

export const INVENTORY_QUERY = `
  query InventoryItems($ids: [ID!]!) {
    nodes(ids: $ids) {
      ... on ProductVariant {
        id
        inventoryQuantity
        availableForSale
        sku
        title
        price {
          amount
          currencyCode
        }
        product {
          title
          handle
        }
      }
    }
  }
`;

export const COLLECTIONS_QUERY = `
  query Collections($first: Int!, $after: String) {
    collections(first: $first, after: $after) {
      edges {
        node {
          id
          title
          handle
          description
          products(first: 20) {
            edges {
              node {
                id
                title
                handle
                priceRange {
                  minVariantPrice {
                    amount
                    currencyCode
                  }
                }
                variants(first: 1) {
                  edges {
                    node {
                      inventoryQuantity
                      availableForSale
                    }
                  }
                }
                images(first: 1) {
                  edges {
                    node {
                      url
                      altText
                    }
                  }
                }
              }
            }
          }
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;
