/**
 * Client environment configuration utilities
 *
 * Centralized access to environment variables with fallbacks.
 */

/**
 * Get the website/docs base URL
 *
 * @returns Website URL from env or default docs URL
 * @example
 * ```typescript
 * const url = getWebsiteUrl();
 * // Returns: "http://localhost:3000" (dev) or "https://agentcmd.dev" (prod)
 * ```
 */
export function getWebsiteUrl(): string {
  return import.meta.env.DEV ? "http://localhost:3000" : "https://agentcmd.dev";
}
