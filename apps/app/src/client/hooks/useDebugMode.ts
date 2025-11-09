import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { isDebugMode, setDebugMode } from "@/client/utils/isDebugMode";

/**
 * Hook to check if debug mode is enabled.
 *
 * Debug mode can be enabled by:
 * 1. Adding `?debug=true` to URL (persists to localStorage)
 * 2. Using setDebugMode(true) directly
 * 3. Cleared via DevTools toggle or setDebugMode(false)
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const debugMode = useDebugMode();
 *
 *   if (debugMode) {
 *     console.log('Debug info:', someData);
 *   }
 *
 *   return (
 *     <div>
 *       {debugMode && <DebugPanel />}
 *     </div>
 *   );
 * }
 * ```
 *
 * @returns {boolean} True if debug mode is enabled, false otherwise
 */
export function useDebugMode(): boolean {
  const [searchParams] = useSearchParams();
  const [debugEnabled, setDebugEnabled] = useState(isDebugMode());

  // Sync URL param to localStorage and trigger re-render
  useEffect(() => {
    if (searchParams.get('debug') === 'true') {
      setDebugMode(true);
      setDebugEnabled(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Watch for changes to localStorage (e.g., when disabled from panel)
  useEffect(() => {
    const handleStorageChange = () => {
      setDebugEnabled(isDebugMode());
    };

    window.addEventListener('storage', handleStorageChange);

    // Also check periodically in case localStorage changed in same window
    const interval = setInterval(() => {
      setDebugEnabled(isDebugMode());
    }, 100);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  return debugEnabled;
}
