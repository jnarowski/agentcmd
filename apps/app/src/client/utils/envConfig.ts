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
 * // Returns: "http://localhost:3000" (dev) or "https://docs.agentcmd.com" (prod)
 * ```
 */
export function getWebsiteUrl(): string {
  return import.meta.env.VITE_WEBSITE_URL || "http://localhost:3000";
}
