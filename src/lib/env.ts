import { z } from "zod";

/**
 * Environment variables validation schema using Zod
 * Provides type-safe environment variable validation with helpful error messages
 */
const envSchema = z.object({
  // Required environment variables
  SHOPIFY_STORE_DOMAIN: z
    .string()
    .min(1, "SHOPIFY_STORE_DOMAIN is required")
    .regex(
      /^[a-zA-Z0-9-]+\.myshopify\.com$/,
      "SHOPIFY_STORE_DOMAIN must be a valid Shopify store domain (e.g., mystore.myshopify.com)"
    ),

  // Optional environment variables with defaults
  SHOPIFY_API_VERSION: z
    .string()
    .default("2024-04")
    .refine(
      (version) => /^20\d{2}-\d{2}$/.test(version),
      "SHOPIFY_API_VERSION must be in format YYYY-MM"
    ),

  // Node environment
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
});

/**
 * Validates and parses environment variables
 * Throws detailed error messages for invalid configurations
 */
function validateEnvironment() {
  try {
    const parsed = envSchema.parse(process.env);
    return {
      ...parsed,
      // Derived values
      isDevelopment: parsed.NODE_ENV === "development",
      isProduction: parsed.NODE_ENV === "production",
      isTest: parsed.NODE_ENV === "test",
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join("\n");

      throw new Error(`Environment validation failed:\n${issues}`);
    }

    throw new Error(
      `Environment validation failed: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
 * Validated environment variables
 * Use this instead of process.env throughout the application
 */
export const env = validateEnvironment();

// Export the schema for documentation/testing purposes
export { envSchema };

// Type for the validated environment
export type Env = typeof env;
