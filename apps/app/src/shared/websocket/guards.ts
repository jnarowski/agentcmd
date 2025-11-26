/**
 * Type Guards for Runtime Validation
 *
 * These type guards provide runtime validation while narrowing TypeScript types.
 * Use them to safely handle incoming WebSocket events.
 */

import type { SessionEvent, GlobalEvent, ShellEvent, ChannelEvent } from '../types/websocket.types'
import { SessionEventTypes, GlobalEventTypes, ShellEventTypes } from '../types/websocket.types'

/**
 * Type guard to check if an event is a SessionEvent
 * Narrows TypeScript type and validates at runtime
 *
 * @example
 * if (isSessionEvent(event)) {
 *   // TypeScript knows event is SessionEvent here
 *   switch (event.type) {
 *     case SessionEventTypes.STREAM_OUTPUT:
 *       // ...
 *   }
 * }
 */
export function isSessionEvent(event: ChannelEvent): event is SessionEvent {
  const types = Object.values(SessionEventTypes) as readonly string[]
  return types.includes(event.type)
}

/**
 * Type guard to check if an event is a GlobalEvent
 */
export function isGlobalEvent(event: ChannelEvent): event is GlobalEvent {
  const types = Object.values(GlobalEventTypes) as readonly string[]
  return types.includes(event.type)
}

/**
 * Type guard to check if an event is a ShellEvent
 */
export function isShellEvent(event: ChannelEvent): event is ShellEvent {
  const types = Object.values(ShellEventTypes) as readonly string[]
  return types.includes(event.type)
}

/**
 * Validates that an object has the expected ChannelEvent structure
 * Does not validate the type field - use specific guards for that
 */
export function isChannelEvent(obj: unknown): obj is ChannelEvent {
  if (typeof obj !== 'object' || obj === null) {
    return false
  }

  const event = obj as Record<string, unknown>
  return typeof event.type === 'string' && 'data' in event
}

/**
 * Validates WebSocket message structure
 */
export function isWebSocketMessage(
  obj: unknown
): obj is { channel: string; type: string; data: unknown } {
  if (typeof obj !== 'object' || obj === null) {
    return false
  }

  const msg = obj as Record<string, unknown>
  return (
    typeof msg.channel === 'string' &&
    typeof msg.type === 'string' &&
    'data' in msg
  )
}
