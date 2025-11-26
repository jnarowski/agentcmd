/**
 * Debug mode utilities
 *
 * Debug mode can be enabled by:
 * 1. Adding ?debug=true to URL (sets localStorage)
 * 2. Manually via setDebugMode(true)
 * 3. Cleared via DevTools toggle or setDebugMode(false)
 */

const DEBUG_KEY = 'debug';

/**
 * Check if debug mode is enabled
 * Works outside React context (no hooks required)
 */
export function isDebugMode(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(DEBUG_KEY) === 'true';
}

/**
 * Set debug mode state
 * @param enabled - True to enable, false to disable
 */
export function setDebugMode(enabled: boolean): void {
  if (typeof window === 'undefined') return;

  if (enabled) {
    localStorage.setItem(DEBUG_KEY, 'true');
  } else {
    localStorage.removeItem(DEBUG_KEY);
  }
}
