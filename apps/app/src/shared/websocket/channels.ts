/**
 * Channel Name Builders
 *
 * Phoenix Channels pattern uses namespaced channel names (e.g., "session:123")
 * These builders ensure consistent naming and provide type safety.
 */

/**
 * Channel name builders
 * Returns const strings for type safety
 */
export const Channels = {
  /**
   * Session channel for agent streaming and message handling
   * @param id - Session ID
   * @returns Channel name in format "session:ID"
   */
  session: (id: string) => `session:${id}` as const,

  /**
   * Project channel for project-level updates
   * @param id - Project ID
   * @returns Channel name in format "project:ID"
   */
  project: (id: string) => `project:${id}` as const,

  /**
   * Shell channel for terminal PTY streams
   * @param id - Shell ID
   * @returns Channel name in format "shell:ID"
   */
  shell: (id: string) => `shell:${id}` as const,

  /**
   * Global channel for connection-level events (heartbeat, errors)
   * @returns Channel name "global"
   */
  global: () => 'global' as const,
}

/**
 * Parsed channel information
 */
export interface ParsedChannel {
  resource: string
  id: string
}

/**
 * Parse a channel name into its components
 * @param channel - Channel name (e.g., "session:123")
 * @returns Parsed channel with resource and ID, or null if invalid
 *
 * @example
 * parseChannel('session:abc123') // { resource: 'session', id: 'abc123' }
 * parseChannel('global') // { resource: 'global', id: '' }
 * parseChannel('invalid') // null
 */
export function parseChannel(channel: string): ParsedChannel | null {
  // Handle global channel (no ID)
  if (channel === 'global') {
    return { resource: 'global', id: '' }
  }

  // Handle namespaced channels (resource:id)
  const match = channel.match(/^([^:]+):(.+)$/)
  if (match) {
    const [, resource, id] = match
    return { resource, id }
  }

  // Invalid format
  return null
}

/**
 * Type guard to check if a channel is a session channel
 */
export function isSessionChannel(channel: string): boolean {
  const parsed = parseChannel(channel)
  return parsed?.resource === 'session'
}

/**
 * Type guard to check if a channel is a shell channel
 */
export function isShellChannel(channel: string): boolean {
  const parsed = parseChannel(channel)
  return parsed?.resource === 'shell'
}

/**
 * Type guard to check if a channel is a project channel
 */
export function isProjectChannel(channel: string): boolean {
  const parsed = parseChannel(channel)
  return parsed?.resource === 'project'
}

/**
 * Type guard to check if a channel is the global channel
 */
export function isGlobalChannel(channel: string): boolean {
  return channel === 'global'
}
