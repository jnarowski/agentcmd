import type { Page } from "@playwright/test";

/**
 * WebSocket Testing Utilities
 *
 * Provides helpers for testing WebSocket real-time features:
 * - setupWebSocketForwarding: Capture WebSocket events from page
 * - waitForWebSocketEvent: Wait for specific event type with timeout
 */

export interface WebSocketEvent {
  type: string;
  data: unknown;
}

/**
 * Setup WebSocket event forwarding from page to test context
 *
 * Captures all WebSocket messages sent to the page and stores them
 * in an array that can be inspected by test code.
 *
 * @param page - Playwright page instance
 * @returns Array to collect WebSocket events
 *
 * @example
 * const wsEvents = await setupWebSocketForwarding(page);
 * await page.goto('/sessions/123');
 * // ... trigger action that sends WebSocket event
 * const event = wsEvents.find(e => e.type === 'session.created');
 */
export async function setupWebSocketForwarding(
  page: Page
): Promise<WebSocketEvent[]> {
  const wsEvents: WebSocketEvent[] = [];

  // Expose function to capture events from page context
  await page.exposeFunction(
    "captureWsEvent",
    (type: string, data: unknown) => {
      wsEvents.push({ type, data });
    }
  );

  // Inject WebSocket listener into page context
  await page.evaluate(() => {
    const originalWebSocket = window.WebSocket;

    window.WebSocket = class extends originalWebSocket {
      constructor(url: string | URL, protocols?: string | string[]) {
        super(url, protocols);

        this.addEventListener("message", (event) => {
          try {
            const message = JSON.parse(event.data);
            // @ts-ignore - captureWsEvent is exposed from test
            window.captureWsEvent(message.type, message);
          } catch {
            // Not JSON, skip
          }
        });
      }
    };
  });

  return wsEvents;
}

/**
 * Wait for a specific WebSocket event type
 *
 * Polls the wsEvents array until an event with matching type is found,
 * or timeout is reached.
 *
 * @param page - Playwright page instance
 * @param wsEvents - Array of captured WebSocket events
 * @param eventType - Event type to wait for (e.g., 'session.created')
 * @param timeout - Timeout in milliseconds (default: 10000)
 * @returns The matched WebSocket event
 *
 * @example
 * const event = await waitForWebSocketEvent(page, wsEvents, 'session.created', 10_000);
 * expect(event.data.sessionId).toBeDefined();
 */
export async function waitForWebSocketEvent(
  page: Page,
  wsEvents: WebSocketEvent[],
  eventType: string,
  timeout: number = 10_000
): Promise<WebSocketEvent> {
  await page.waitForFunction(
    ({ events, type }) => {
      return events.some((e: WebSocketEvent) => e.type === type);
    },
    { events: wsEvents, type: eventType },
    { timeout }
  );

  const event = wsEvents.find((e) => e.type === eventType);
  if (!event) {
    throw new Error(`WebSocket event '${eventType}' not found after waiting`);
  }

  return event;
}

/**
 * Wait for WebSocket event matching predicate
 *
 * More flexible version that allows custom matching logic.
 *
 * @param page - Playwright page instance
 * @param wsEvents - Array of captured WebSocket events
 * @param predicate - Function to match event
 * @param timeout - Timeout in milliseconds (default: 10000)
 * @returns The matched WebSocket event
 *
 * @example
 * const event = await waitForWebSocketEventMatching(
 *   page,
 *   wsEvents,
 *   (e) => e.type === 'session.state_changed' && e.data.state === 'completed',
 *   10_000
 * );
 */
export async function waitForWebSocketEventMatching(
  page: Page,
  wsEvents: WebSocketEvent[],
  predicate: (event: WebSocketEvent) => boolean,
  timeout: number = 10_000
): Promise<WebSocketEvent> {
  await page.waitForFunction(
    ({ events, pred }) => {
      // @ts-ignore - predicate serialized as string
      const predicateFn = new Function("event", `return (${pred})(event)`);
      return events.some((e: WebSocketEvent) => predicateFn(e));
    },
    { events: wsEvents, pred: predicate.toString() },
    { timeout }
  );

  const event = wsEvents.find(predicate);
  if (!event) {
    throw new Error(`WebSocket event matching predicate not found after waiting`);
  }

  return event;
}
