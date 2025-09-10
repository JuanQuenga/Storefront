import { createStorefrontApiClient } from '@shopify/storefront-api-client';

if (!process.env.SHOPIFY_STORE_DOMAIN) {
  throw new Error('SHOPIFY_STORE_DOMAIN environment variable is required');
}

if (!process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN) {
  throw new Error('SHOPIFY_STOREFRONT_ACCESS_TOKEN environment variable is required');
}

// Initialize the Storefront API client
export const shopifyClient = createStorefrontApiClient({
  storeDomain: process.env.SHOPIFY_STORE_DOMAIN,
  accessToken: process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN,
  apiVersion: process.env.SHOPIFY_API_VERSION || '2024-04',
});

// GraphQL queries
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

export const PRODUCT_BY_ID_QUERY = `
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
