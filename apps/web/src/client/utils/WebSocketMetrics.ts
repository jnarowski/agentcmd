/**
 * WebSocketMetrics
 *
 * Tracks WebSocket connection health and performance metrics for debugging and monitoring.
 * Metrics are exposed to `window.__WS_METRICS__` in development mode for DevTools access.
 *
 * @example
 * ```typescript
 * import { wsMetrics } from '@/client/utils/WebSocketMetrics';
 *
 * // Track sent message
 * wsMetrics.trackSent();
 *
 * // Track received message
 * wsMetrics.trackReceived();
 *
 * // Track reconnection
 * wsMetrics.trackReconnection();
 *
 * // Track ping/pong latency
 * wsMetrics.trackLatency(45); // 45ms
 *
 * // Get average latency
 * console.log(wsMetrics.averageLatency); // Returns average from last 100 pings
 *
 * // Reset all metrics
 * wsMetrics.reset();
 * ```
 */

/**
 * WebSocket performance and health metrics tracker
 */
export class WebSocketMetrics {
  private _messagesSent = 0;
  private _messagesReceived = 0;
  private _reconnections = 0;
  private _latencies: number[] = [];
  private readonly MAX_LATENCY_SAMPLES = 100;

  constructor() {
    // Expose metrics to window in dev mode for debugging
    if (import.meta.env.DEV) {
      (window as unknown as Record<string, unknown>).__WS_METRICS__ = this;
    }
  }

  /**
   * Track a sent message
   */
  trackSent(): void {
    this._messagesSent++;
  }

  /**
   * Track a received message
   */
  trackReceived(): void {
    this._messagesReceived++;
  }

  /**
   * Track a reconnection attempt
   */
  trackReconnection(): void {
    this._reconnections++;
  }

  /**
   * Track ping/pong latency in milliseconds
   * @param latencyMs Latency in milliseconds
   */
  trackLatency(latencyMs: number): void {
    this._latencies.push(latencyMs);

    // Keep rolling window of last 100 samples
    if (this._latencies.length > this.MAX_LATENCY_SAMPLES) {
      this._latencies.shift();
    }
  }

  /**
   * Get average latency from recent samples
   * @returns Average latency in milliseconds, or null if no samples
   */
  get averageLatency(): number | null {
    if (this._latencies.length === 0) {
      return null;
    }

    const sum = this._latencies.reduce((acc, val) => acc + val, 0);
    return Math.round(sum / this._latencies.length);
  }

  /**
   * Get total messages sent
   */
  get messagesSent(): number {
    return this._messagesSent;
  }

  /**
   * Get total messages received
   */
  get messagesReceived(): number {
    return this._messagesReceived;
  }

  /**
   * Get total reconnection attempts
   */
  get reconnections(): number {
    return this._reconnections;
  }

  /**
   * Get all latency samples (for graphing)
   */
  get latencies(): readonly number[] {
    return this._latencies;
  }

  /**
   * Reset all metrics to zero
   */
  reset(): void {
    this._messagesSent = 0;
    this._messagesReceived = 0;
    this._reconnections = 0;
    this._latencies = [];
  }

  /**
   * Get a snapshot of all metrics
   */
  snapshot() {
    return {
      messagesSent: this._messagesSent,
      messagesReceived: this._messagesReceived,
      reconnections: this._reconnections,
      averageLatency: this.averageLatency,
      latencySamples: this._latencies.length,
    };
  }
}

/**
 * Singleton instance of WebSocketMetrics
 * Import and use this directly throughout the application
 */
export const wsMetrics = new WebSocketMetrics();
