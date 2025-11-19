import type { PermissionMode } from "agent-cli-sdk";

/**
 * Permission modes configuration for Claude Code sessions
 * Defines available permission modes with display properties
 */
export interface PermissionModeConfig {
  id: PermissionMode;
  name: string;
  shortName: string;
  color: string;
}

/**
 * Available permission modes for Claude Code
 * @see https://docs.anthropic.com/claude/docs/cli#permission-modes
 */
export const PERMISSION_MODES: ReadonlyArray<PermissionModeConfig> = [
  {
    id: "default",
    name: "Default",
    shortName: "Default",
    color: "bg-gray-500",
  },
  {
    id: "plan",
    name: "Plan Mode",
    shortName: "Plan",
    color: "bg-primary",
  },
  {
    id: "acceptEdits",
    name: "Accept Edits",
    shortName: "Accept",
    color: "bg-purple-500",
  },
  {
    id: "bypassPermissions",
    name: "Bypass Permissions",
    shortName: "Bypass",
    color: "bg-red-500",
  },
] as const;
