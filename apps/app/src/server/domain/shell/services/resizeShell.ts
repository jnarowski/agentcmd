import type { ResizeShellOptions } from '../types/ResizeShellOptions';

/**
 * Resize a shell session terminal
 */
export function resizeShell({ ptyProcess, cols, rows }: ResizeShellOptions): void {
  ptyProcess.resize(cols, rows);
}
