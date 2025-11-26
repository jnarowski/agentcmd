/**
 * Slash Command Types
 * Shared types for slash command functionality
 */

export interface SlashCommand {
  /** Command name without leading slash (e.g., "help", "e2e:chat") */
  name: string;

  /** Full command with leading slash (e.g., "/help", "/e2e:chat") */
  fullCommand: string;

  /** Command description */
  description: string;

  /** Optional argument hints as array (e.g., ["title", "format"]) */
  argumentHints?: string[];

  /** Command type: builtin (Claude Code default) or custom (project-specific) */
  type: 'builtin' | 'custom';
}
