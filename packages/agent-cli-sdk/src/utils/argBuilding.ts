import type { PermissionMode } from '../types/permissions';

/**
 * Converts permission mode to CLI flags
 *
 * @param mode - Permission mode
 * @returns Array of CLI flags
 */
export function permissionModeToFlags(mode?: PermissionMode): string[] {
  if (!mode || mode === 'default') {
    return [];
  }

  switch (mode) {
    case 'plan':
      return ['--plan'];
    case 'acceptEdits':
      return ['--accept-edits'];
    case 'bypassPermissions':
      return ['--bypass-permissions'];
    default:
      return [];
  }
}

/**
 * Converts working directory to CLI flags
 *
 * @param cwd - Working directory path
 * @returns Array of CLI flags
 */
export function workingDirToFlags(cwd?: string): string[] {
  return cwd ? ['--cwd', cwd] : [];
}
