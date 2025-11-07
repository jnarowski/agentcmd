/**
 * Channel Naming Helpers
 *
 * Provides consistent channel ID generation across the application.
 * All channels follow the format: {resource}:{id}
 *
 * Examples:
 * - session:abc123
 * - project:xyz789
 * - terminal:term-001
 */

/** Resource type constants */
export const RESOURCE_SESSION = "session";
export const RESOURCE_PROJECT = "project";
export const RESOURCE_TERMINAL = "terminal";

/**
 * Generate a session channel ID
 *
 * @param sessionId - Session identifier
 * @returns Channel ID in format "session:{id}"
 *
 * @example
 * sessionChannel("abc123") // "session:abc123"
 */
export function sessionChannel(sessionId: string): string {
  return `${RESOURCE_SESSION}:${sessionId}`;
}

/**
 * Generate a project channel ID
 *
 * @param projectId - Project identifier
 * @returns Channel ID in format "project:{id}"
 *
 * @example
 * projectChannel("xyz789") // "project:xyz789"
 */
export function projectChannel(projectId: string): string {
  return `${RESOURCE_PROJECT}:${projectId}`;
}

/**
 * Generate a terminal channel ID
 *
 * @param terminalId - Terminal identifier
 * @returns Channel ID in format "terminal:{id}"
 *
 * @example
 * terminalChannel("term-001") // "terminal:term-001"
 */
export function terminalChannel(terminalId: string): string {
  return `${RESOURCE_TERMINAL}:${terminalId}`;
}

/**
 * Parse a channel ID into resource type and ID
 *
 * @param channelId - Channel identifier (e.g., "session:abc123")
 * @returns Object with resource type and ID, or null if invalid format
 *
 * @example
 * parseChannel("session:abc123") // { resource: "session", id: "abc123" }
 * parseChannel("invalid") // null
 */
export function parseChannel(
  channelId: string
): { resource: string; id: string } | null {
  const parts = channelId.split(":");

  if (parts.length !== 2) {
    return null;
  }

  const [resource, id] = parts;

  if (!resource || !id) {
    return null;
  }

  return { resource, id };
}
