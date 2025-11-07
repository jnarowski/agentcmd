import { useSearchParams } from "react-router-dom";

/**
 * Hook to check if debug mode is enabled via URL query parameter.
 *
 * Debug mode is enabled when the URL contains `?debug=true` or `&debug=true`.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const isDebugMode = useDebugMode();
 *
 *   if (isDebugMode) {
 *     console.log('Debug info:', someData);
 *   }
 *
 *   return (
 *     <div>
 *       {isDebugMode && <DebugPanel />}
 *     </div>
 *   );
 * }
 * ```
 *
 * @returns {boolean} True if debug mode is enabled, false otherwise
 */
export function useDebugMode(): boolean {
  const [searchParams] = useSearchParams();
  return searchParams.get('debug') === 'true';
}
