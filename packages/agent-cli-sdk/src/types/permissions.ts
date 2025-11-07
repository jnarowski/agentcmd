/**
 * Permission modes for AI CLI tools
 * - default: Prompt for all actions
 * - plan: Plan mode, no execution
 * - acceptEdits: Auto-accept file edits
 * - bypassPermissions: Bypass all permission checks
 */
export type PermissionMode = 'default' | 'plan' | 'acceptEdits' | 'bypassPermissions';
