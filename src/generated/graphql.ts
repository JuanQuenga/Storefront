export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  DateTime: { input: string; output: string; }
  Decimal: { input: string; output: string; }
  Money: { input: string; output: string; }
  URL: { input: string; output: string; }
};

export type Collection = Node & {
  __typename?: 'Collection';
  description?: Maybe<Scalars['String']['output']>;
  handle: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  products: ProductConnection;
  title: Scalars['String']['output'];
};


export type CollectionProductsArgs = {
  first?: InputMaybe<Scalars['Int']['input']>;
};

export type CollectionConnection = {
  __typename?: 'CollectionConnection';
  edges: Array<CollectionEdge>;
  pageInfo: PageInfo;
};

export type CollectionEdge = {
  __typename?: 'CollectionEdge';
  node: Collection;
};

export enum CurrencyCode {
  Aud = 'AUD',
  Cad = 'CAD',
  Eur = 'EUR',
  Gbp = 'GBP',
  Usd = 'USD'
}

export type Image = {
  __typename?: 'Image';
  altText?: Maybe<Scalars['String']['output']>;
  height?: Maybe<Scalars['Int']['output']>;
  url: Scalars['URL']['output'];
  width?: Maybe<Scalars['Int']['output']>;
};

export type ImageConnection = {
  __typename?: 'ImageConnection';
  edges: Array<ImageEdge>;
};

export type ImageEdge = {
  __typename?: 'ImageEdge';
  node: Image;
};

export type MoneyV2 = {
  __typename?: 'MoneyV2';
  amount: Scalars['Decimal']['output'];
  currencyCode: CurrencyCode;
};

export type Node = {
  id: Scalars['ID']['output'];
};

export type PageInfo = {
  __typename?: 'PageInfo';
  endCursor?: Maybe<Scalars['String']['output']>;
  hasNextPage: Scalars['Boolean']['output'];
};

export type Product = Node & {
  __typename?: 'Product';
  collections: CollectionConnection;
  description?: Maybe<Scalars['String']['output']>;
  handle: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  images: ImageConnection;
  priceRange: ProductPriceRange;
  productType: Scalars['String']['output'];
  tags: Array<Scalars['String']['output']>;
  title: Scalars['String']['output'];
  variants: ProductVariantConnection;
  vendor: Scalars['String']['output'];
};


export type ProductCollectionsArgs = {
  first?: InputMaybe<Scalars['Int']['input']>;
};


export type ProductImagesArgs = {
  first?: InputMaybe<Scalars['Int']['input']>;
};


export type ProductVariantsArgs = {
  first?: InputMaybe<Scalars['Int']['input']>;
};

export type ProductConnection = {
  __typename?: 'ProductConnection';
  edges: Array<ProductEdge>;
  pageInfo: PageInfo;
};

export type ProductEdge = {
  __typename?: 'ProductEdge';
  node: Product;
};

export type ProductPriceRange = {
  __typename?: 'ProductPriceRange';
  maxVariantPrice: MoneyV2;
  minVariantPrice: MoneyV2;
};

export type ProductVariant = Node & {
  __typename?: 'ProductVariant';
  availableForSale: Scalars['Boolean']['output'];
  compareAtPrice?: Maybe<MoneyV2>;
  id: Scalars['ID']['output'];
  inventoryQuantity: Scalars['Int']['output'];
  price: MoneyV2;
  product: Product;
  selectedOptions: Array<SelectedOption>;
  sku?: Maybe<Scalars['String']['output']>;
  title: Scalars['String']['output'];
  weight?: Maybe<Scalars['Float']['output']>;
  weightUnit?: Maybe<WeightUnit>;
};

export type ProductVariantConnection = {
  __typename?: 'ProductVariantConnection';
  edges: Array<ProductVariantEdge>;
};

export type ProductVariantEdge = {
  __typename?: 'ProductVariantEdge';
  node: ProductVariant;
};

export type Query = {
  __typename?: 'Query';
  collections: CollectionConnection;
  nodes: Array<Node>;
  product?: Maybe<Product>;
  products: ProductConnection;
};


export type QueryCollectionsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryNodesArgs = {
  ids: Array<Scalars['ID']['input']>;
};


export type QueryProductArgs = {
  id: Scalars['ID']['input'];
};


export type QueryProductsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  query?: InputMaybe<Scalars['String']['input']>;
};

export type SelectedOption = {
  __typename?: 'SelectedOption';
  name: Scalars['String']['output'];
  value: Scalars['String']['output'];
};

export enum WeightUnit {
  Grams = 'GRAMS',
  Kilograms = 'KILOGRAMS',
  Ounces = 'OUNCES',
  Pounds = 'POUNDS'
}

export type ProductSearchQueryVariables = Exact<{
  query: Scalars['String']['input'];
  first: Scalars['Int']['input'];
  after?: InputMaybe<Scalars['String']['input']>;
}>;


export type ProductSearchQuery = { __typename?: 'Query', products: { __typename?: 'ProductConnection', edges: Array<{ __typename?: 'ProductEdge', node: { __typename?: 'Product', id: string, title: string, handle: string, description?: string | null, productType: string, tags: Array<string>, vendor: string, priceRange: { __typename?: 'ProductPriceRange', minVariantPrice: { __typename?: 'MoneyV2', amount: string, currencyCode: CurrencyCode }, maxVariantPrice: { __typename?: 'MoneyV2', amount: string, currencyCode: CurrencyCode } }, variants: { __typename?: 'ProductVariantConnection', edges: Array<{ __typename?: 'ProductVariantEdge', node: { __typename?: 'ProductVariant', id: string, title: string, sku?: string | null, inventoryQuantity: number, availableForSale: boolean, price: { __typename?: 'MoneyV2', amount: string, currencyCode: CurrencyCode }, compareAtPrice?: { __typename?: 'MoneyV2', amount: string, currencyCode: CurrencyCode } | null, selectedOptions: Array<{ __typename?: 'SelectedOption', name: string, value: string }> } }> }, images: { __typename?: 'ImageConnection', edges: Array<{ __typename?: 'ImageEdge', node: { __typename?: 'Image', url: string, altText?: string | null } }> } } }>, pageInfo: { __typename?: 'PageInfo', hasNextPage: boolean, endCursor?: string | null } } };

export type ProductByIdQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type ProductByIdQuery = { __typename?: 'Query', product?: { __typename?: 'Product', id: string, title: string, handle: string, description?: string | null, productType: string, tags: Array<string>, vendor: string, priceRange: { __typename?: 'ProductPriceRange', minVariantPrice: { __typename?: 'MoneyV2', amount: string, currencyCode: CurrencyCode }, maxVariantPrice: { __typename?: 'MoneyV2', amount: string, currencyCode: CurrencyCode } }, variants: { __typename?: 'ProductVariantConnection', edges: Array<{ __typename?: 'ProductVariantEdge', node: { __typename?: 'ProductVariant', id: string, title: string, sku?: string | null, inventoryQuantity: number, availableForSale: boolean, weight?: number | null, weightUnit?: WeightUnit | null, price: { __typename?: 'MoneyV2', amount: string, currencyCode: CurrencyCode }, compareAtPrice?: { __typename?: 'MoneyV2', amount: string, currencyCode: CurrencyCode } | null, selectedOptions: Array<{ __typename?: 'SelectedOption', name: string, value: string }> } }> }, images: { __typename?: 'ImageConnection', edges: Array<{ __typename?: 'ImageEdge', node: { __typename?: 'Image', url: string, altText?: string | null, width?: number | null, height?: number | null } }> }, collections: { __typename?: 'CollectionConnection', edges: Array<{ __typename?: 'CollectionEdge', node: { __typename?: 'Collection', id: string, title: string, handle: string } }> } } | null };

export type InventoryItemsQueryVariables = Exact<{
  ids: Array<Scalars['ID']['input']> | Scalars['ID']['input'];
}>;


export type InventoryItemsQuery = { __typename?: 'Query', nodes: Array<
    | { __typename?: 'Collection' }
    | { __typename?: 'Product' }
    | { __typename?: 'ProductVariant', id: string, inventoryQuantity: number, availableForSale: boolean, sku?: string | null, title: string, price: { __typename?: 'MoneyV2', amount: string, currencyCode: CurrencyCode }, product: { __typename?: 'Product', title: string, handle: string } }
  > };

export type CollectionsQueryVariables = Exact<{
  first: Scalars['Int']['input'];
  after?: InputMaybe<Scalars['String']['input']>;
}>;


export type CollectionsQuery = { __typename?: 'Query', collections: { __typename?: 'CollectionConnection', edges: Array<{ __typename?: 'CollectionEdge', node: { __typename?: 'Collection', id: string, title: string, handle: string, description?: string | null, products: { __typename?: 'ProductConnection', edges: Array<{ __typename?: 'ProductEdge', node: { __typename?: 'Product', id: string, title: string, handle: string, priceRange: { __typename?: 'ProductPriceRange', minVariantPrice: { __typename?: 'MoneyV2', amount: string, currencyCode: CurrencyCode } }, variants: { __typename?: 'ProductVariantConnection', edges: Array<{ __typename?: 'ProductVariantEdge', node: { __typename?: 'ProductVariant', inventoryQuantity: number, availableForSale: boolean } }> }, images: { __typename?: 'ImageConnection', edges: Array<{ __typename?: 'ImageEdge', node: { __typename?: 'Image', url: string, altText?: string | null } }> } } }> } } }>, pageInfo: { __typename?: 'PageInfo', hasNextPage: boolean, endCursor?: string | null } } };
