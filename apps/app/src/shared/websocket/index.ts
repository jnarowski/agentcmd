/**
 * Shared WebSocket Infrastructure
 *
 * Barrel export for WebSocket channel builders and type guards.
 * Both frontend and backend should import from this module for WebSocket plumbing.
 *
 * Note: WebSocket types have been moved to @/shared/types/websocket.types
 * Note: WebSocket schemas have been moved to @/shared/schemas/workflow.schemas
 *
 * @example Backend usage:
 * import { Channels } from '@/shared/websocket'
 * import { SessionEventTypes } from '@/shared/types/websocket.types'
 * broadcast(Channels.session(id), { type: SessionEventTypes.STREAM_OUTPUT, data: {...} })
 *
 * @example Frontend usage:
 * import { Channels } from '@/shared/websocket'
 * import type { SessionEvent } from '@/shared/types/websocket.types'
 * eventBus.on<SessionEvent>(Channels.session(id), (event) => { ... })
 */

// Export channel builders and utilities
export * from './channels'

// Export type guards
export * from './guards'
