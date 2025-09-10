import { createStorefrontApiClient } from "@shopify/storefront-api-client";
import gql from "graphql-tag";

// Initialize the Storefront API client
export const shopifyClient =
  process.env.SHOPIFY_STORE_DOMAIN &&
  process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN
    ? createStorefrontApiClient({
        storeDomain: process.env.SHOPIFY_STORE_DOMAIN,
        publicAccessToken: process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN,
        apiVersion: process.env.SHOPIFY_API_VERSION || "2024-04",
      } as any)
    : null;

// Function to get the client with validation
export function getShopifyClient() {
  if (!shopifyClient) {
    throw new Error(
      "Shopify client not initialized. Please check your environment variables."
    );
  }
  return shopifyClient;
}

// GraphQL queries using gql template literals
export const PRODUCT_SEARCH_QUERY = gql`
  query ProductSearch($query: String!, $first: Int!, $after: String) {
    products(query: $query, first: $first, after: $after) {
      edges {
        node {
          id
          title
          handle
          description
          productType
          tags
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

export const PRODUCT_BY_ID_QUERY = gql`
  query ProductById($id: ID!) {
    product(id: $id) {
      id
      title
      handle
      description
      productType
      tags
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

export const INVENTORY_QUERY = gql`
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

export const COLLECTIONS_QUERY = gql`
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
