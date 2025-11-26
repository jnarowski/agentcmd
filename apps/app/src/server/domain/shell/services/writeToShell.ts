import type { WriteToShellOptions } from '../types/WriteToShellOptions';

/**
 * Write data to a shell session
 */
export function writeToShell({ ptyProcess, data }: WriteToShellOptions): void {
  ptyProcess.write(data);
}
