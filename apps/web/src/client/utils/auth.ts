/**
 * Authentication utility functions
 * Provides access to auth state outside of React components
 */

import { useAuthStore } from '@/client/stores';

/**
 * Get the authentication token
 * Can be used in both React and non-React contexts
 *
 * @returns The JWT token or null if not authenticated
 *
 * @example
 * // In a utility function
 * const token = getAuthToken();
 * if (token) {
 *   // Make authenticated request
 * }
 *
 * @example
 * // In React components, prefer using the hook directly:
 * const token = useAuthStore((s) => s.token);
 */
export function getAuthToken(): string | null {
  return useAuthStore.getState().token;
}
