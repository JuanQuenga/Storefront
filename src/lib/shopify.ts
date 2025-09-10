import { env } from "./env";

// Tokenless fetch helper for Storefront API per docs:
// https://shopify.dev/docs/api/storefront#authentication
export async function storefrontRequest<TData = any>(
  query: string,
  variables?: Record<string, any>
): Promise<{ data?: TData; errors?: any }> {
  const url = `https://${env.SHOPIFY_STORE_DOMAIN}/api/${env.SHOPIFY_API_VERSION}/graphql.json`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables }),
    // Ensure server-side runtime fetch
    cache: "no-store",
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      `Storefront request failed: ${res.status} ${
        res.statusText
      } - ${JSON.stringify(json)}`
    );
  }
  return json;
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
                quantityAvailable
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
        quantityAvailable
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
                      quantityAvailable
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
