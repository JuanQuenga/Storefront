import type { CodegenConfig } from "@graphql-codegen/cli";

const config: CodegenConfig = {
  overwrite: true,
  schema: "src/graphql/schema.graphql",
  documents: "src/**/*.ts",
  generates: {
    "src/generated/graphql.ts": {
      plugins: ["typescript", "typescript-operations"],
      config: {
        skipTypename: false,
        withHooks: false,
        withHOC: false,
        withComponent: false,
        scalars: {
          DateTime: "string",
          URL: "string",
          Decimal: "string",
          Money: "string",
        },
      },
    },
  },
};

export default config;
