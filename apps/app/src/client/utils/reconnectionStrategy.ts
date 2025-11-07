/**
 * Shared WebSocket reconnection strategy
 *
 * Provides exponential backoff with configurable delays and maximum cap.
 * Used by both WebSocketProvider and shell WebSocket connections.
 *
 * @example
 * ```typescript
 * import { calculateReconnectDelay } from '@/client/utils/reconnectionStrategy';
 *
 * // Use default delays and max
 * const delay1 = calculateReconnectDelay(0); // 1000ms
 * const delay2 = calculateReconnectDelay(1); // 2000ms
 * const delay3 = calculateReconnectDelay(10); // 30000ms (capped at max)
 *
 * // Custom delays and max
 * const customDelay = calculateReconnectDelay(
 *   2,
 *   [500, 1000, 2000, 5000],
 *   10000
 * ); // 2000ms
 * ```
 */

/**
 * Default reconnection delays (exponential backoff)
 * Pattern: 1s, 2s, 4s, 8s, 16s
 */
export const DEFAULT_RECONNECT_DELAYS = [1000, 2000, 4000, 8000, 16000];

/**
 * Default maximum reconnection delay (30 seconds)
 */
export const DEFAULT_MAX_RECONNECT_DELAY = 30000;

/**
 * Calculate the reconnection delay for a given attempt number
 *
 * @param attempt The reconnection attempt number (0-indexed)
 * @param delays Array of delay values in milliseconds (default: exponential backoff 1s-16s)
 * @param maxDelay Maximum delay cap in milliseconds (default: 30s)
 * @returns The delay to wait before reconnecting, in milliseconds
 */
export function calculateReconnectDelay(
  attempt: number,
  delays: number[] = DEFAULT_RECONNECT_DELAYS,
  maxDelay: number = DEFAULT_MAX_RECONNECT_DELAY
): number {
  // Get delay for this attempt, or use the last delay if we've exceeded the array
  const delayIndex = Math.min(attempt, delays.length - 1);
  const delay = delays[delayIndex];

  // Cap at maximum delay
  return Math.min(delay, maxDelay);
}
