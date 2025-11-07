/**
 * WebSocket Type Definitions
 *
 * TypeScript interfaces for WebSocket message structures and data payloads.
 * Used by the WebSocket handler for type-safe message processing.
 *
 * NOTE: Most event types and constants are now defined in @/shared/websocket
 * This file only contains server-specific types and re-exports shared types.
 */

// Re-export all shared WebSocket types
export * from '@/shared/websocket/index'

/**
 * Payload for session send_message events
 * Represents a user message sent to an AI agent session
 */
export interface SessionSendMessageData {
  message: string;
  images?: string[]; // Array of base64-encoded images or file paths
  config?: Record<string, unknown>;
}

/**
 * Payload for shell input events
 * Represents user input to be sent to a shell session
 */
export interface ShellInputData {
  input: string;
}

/**
 * Payload for shell resize events
 * Represents terminal window resize dimensions
 */
export interface ShellResizeData {
  rows: number;
  cols: number;
}

/**
 * Payload for shell initialization events
 * Configuration for starting a new shell session
 */
export interface ShellInitData {
  cwd?: string;
  env?: Record<string, string>;
}

/**
 * Active session data structure
 * Stored in activeSessions Map for managing ongoing agent sessions
 * Note: We no longer store adapter instances - SDK execute() is stateless
 */
export interface ActiveSessionData {
  projectPath: string;
  userId: string;
  tempImageDir?: string;
}

/**
 * Payload for subscribe messages
 * Clients send this to subscribe to one or more channels
 */
export interface SubscribeMessageData {
  channels: string[]; // Array of channel IDs (e.g., ["session:123", "project:456"])
}

/**
 * Payload for unsubscribe messages
 * Clients send this to unsubscribe from one or more channels
 */
export interface UnsubscribeMessageData {
  channels: string[]; // Array of channel IDs to unsubscribe from
}

/**
 * Payload for subscription error responses
 * Sent when a subscription request fails (e.g., permission denied)
 */
export interface SubscriptionErrorData {
  channelId: string; // Channel that was denied
  reason: string; // Human-readable error message
}
