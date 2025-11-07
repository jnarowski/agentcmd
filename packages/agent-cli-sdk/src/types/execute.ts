import type { PermissionMode } from './permissions';

/**
 * Base options shared across all execute functions.
 *
 * Each tool (Claude, Codex, Gemini) extends these common options with tool-specific
 * features. This interface documents the common pattern but is not used as a base
 * class - each tool maintains its own ExecuteOptions interface for clarity.
 *
 * @example
 * // Common options available in all execute functions:
 * const options = {
 *   prompt: 'List all files in the current directory',
 *   workingDir: '/path/to/project',
 *   permissionMode: 'acceptEdits',
 *   verbose: true,
 *   timeout: 60000,
 * };
 */
export interface BaseExecuteOptions {
  /** The prompt to send to the AI */
  prompt: string;

  /** Working directory for CLI execution (defaults to current directory) */
  workingDir?: string;

  /** Permission mode for the CLI */
  permissionMode?: PermissionMode;

  /** Enable verbose output logging */
  verbose?: boolean;

  /** Timeout in milliseconds */
  timeout?: number;

  /** Session identifier (auto-generated if not provided) */
  sessionId?: string;

  /** Model to use for the AI CLI tool */
  model?: string;

  /** Automatically extract and parse JSON from the response */
  json?: boolean;
}

/**
 * Common pattern for execute callbacks.
 *
 * Note: Actual callback signatures may vary slightly between tools.
 * This documents the common pattern but each tool defines its own callback types.
 */
export interface BaseExecuteCallbacks {
  /** Callback invoked immediately when process starts (before any output) */
  onStart?: (process: import('node:child_process').ChildProcess) => void;

  /** Callback invoked when stdout data is received */
  onStdout?: (data: unknown) => void;

  /** Callback invoked when stderr data is received */
  onStderr?: (chunk: string) => void;

  /** Callback invoked when an error occurs */
  onError?: (error: Error) => void;

  /** Callback invoked when the process closes */
  onClose?: (exitCode: number) => void;
}
