/**
 * @repo/agent-cli-sdk
 *
 * TypeScript SDK for orchestrating AI-powered CLI tools
 */

import type { UnifiedMessage } from './types/unified';
import { loadSession as loadClaudeMessages } from './claude/loadSession';
import {
  execute as executeClaudeCommand,
  type ExecuteOptions as ClaudeExecuteOptions,
  type ExecuteResult as ClaudeExecuteResult,
} from './claude/execute';
import { loadSession as loadCodexMessages } from './codex/loadSession';
import {
  execute as executeCodexCommand,
  type ExecuteOptions as CodexExecuteOptions,
  type ExecuteResult as CodexExecuteResult,
} from './codex/execute';
import { loadSession as loadGeminiMessages } from './gemini/loadSession';
import {
  execute as executeGeminiCommand,
  type ExecuteOptions as GeminiExecuteOptions,
  type ExecuteResult as GeminiExecuteResult,
} from './gemini/execute';

/**
 * Options for loading messages from an AI CLI session.
 */
export interface LoadMessagesOptions {
  /** The AI CLI tool to use */
  tool: 'claude' | 'codex' | 'gemini' | 'cursor';
  /** Unique identifier for the session */
  sessionId: string;
  /** Path to the project directory (defaults to current working directory) */
  projectPath?: string;
}

/**
 * Load messages from an AI CLI session history.
 *
 * Retrieves and parses all messages from a saved AI CLI session, converting them
 * into a unified message format that works across different AI tools.
 *
 * @param options - Configuration for loading the session
 * @returns Promise resolving to an array of unified messages
 *
 * @example
 * ```typescript
 * const messages = await loadMessages({
 *   tool: 'claude',
 *   sessionId: 'abc123',
 *   projectPath: '/path/to/project'
 * });
 *
 * console.log(`Loaded ${messages.length} messages`);
 * messages.forEach(msg => {
 *   console.log(`[${msg.role}]:`, msg.content);
 * });
 * ```
 */
export async function loadMessages(options: LoadMessagesOptions): Promise<UnifiedMessage[]> {
  switch (options.tool) {
    case 'claude':
      return await loadClaudeMessages({
        sessionId: options.sessionId,
        projectPath: options.projectPath || process.cwd(),
      });
    case 'codex':
      return await loadCodexMessages({
        sessionId: options.sessionId,
        projectPath: options.projectPath || process.cwd(),
      });
    case 'gemini':
      return loadGeminiMessages({
        sessionId: options.sessionId,
        projectPath: options.projectPath || process.cwd(),
      });
    case 'cursor':
      throw new Error('Cursor loader not yet implemented');
    default: {
      const _exhaustive: never = options.tool;
      throw new Error(`Unknown tool: ${String(_exhaustive)}`);
    }
  }
}

/**
 * Options for executing an AI CLI command.
 */
export interface ExecuteOptions {
  /** The AI CLI tool to use */
  tool: 'claude' | 'codex' | 'gemini' | 'cursor';
  /** The prompt/instruction to send to the AI */
  prompt: string;
  /** Working directory for the command (defaults to current directory) */
  workingDir?: string;
  /** Timeout in milliseconds (defaults to no timeout) */
  timeout?: number;
  /** Enable verbose output logging */
  verbose?: boolean;
  /** Automatically extract and parse JSON from the response */
  json?: boolean;
  /** Unique session identifier (auto-generated if not provided) */
  sessionId?: string;
  /** Resume an existing session */
  resume?: boolean;
  /** Continue the current session */
  continue?: boolean;
  /** Permission mode for file operations and command execution (Claude only) */
  permissionMode?: 'default' | 'plan' | 'acceptEdits' | 'bypassPermissions';
  /** Model to use for the AI CLI tool (e.g., 'claude-sonnet-4-5-20250929', 'gpt-5-codex') */
  model?: string;
  /** Images to include with the prompt (Claude only) */
  images?: Array<{ path: string }>;
  /**
   * Callback invoked for each event received from the CLI.
   * Provides raw JSONL line, parsed event, and unified message.
   */
  onEvent?: (data: { raw: string; event: unknown; message: UnifiedMessage | null }) => void;
  /**
   * Callback invoked with accumulated output data.
   * Provides raw output, all events, and all messages so far.
   */
  onStdout?: (data: { raw: string; events: unknown[]; messages: UnifiedMessage[] }) => void;
  /** Callback invoked when stderr data is received */
  onStderr?: (chunk: string) => void;
  /** Callback invoked when an error occurs */
  onError?: (error: Error) => void;
  /** Callback invoked when the process closes */
  onClose?: (exitCode: number) => void;
}

/**
 * Execute an AI CLI command programmatically.
 *
 * Runs an AI CLI tool with the specified prompt and options, returning the complete
 * output along with all messages exchanged. Supports real-time callbacks and automatic
 * JSON extraction from responses.
 *
 * @param options - Configuration for executing the command
 * @returns Promise resolving to the execution result with output, messages, and optional extracted JSON
 *
 * @example
 * ```typescript
 * // Basic execution
 * const result = await execute({
 *   tool: 'claude',
 *   prompt: 'List all TypeScript files in the src directory',
 *   workingDir: '/path/to/project'
 * });
 * console.log('Response:', result.data);
 *
 * // With callbacks and JSON extraction
 * const result = await execute<{ files: string[] }>({
 *   tool: 'claude',
 *   prompt: 'List all TS files and return as JSON array',
 *   json: true,
 *   onEvent: ({ message }) => {
 *     if (message) console.log('Message:', message);
 *   },
 *   verbose: true
 * });
 * if (typeof result.data === 'object') {
 *   console.log('Files:', result.data.files);
 * }
 * ```
 */
export async function execute<T = unknown>(
  options: ExecuteOptions
): Promise<ClaudeExecuteResult<T> | CodexExecuteResult<T> | GeminiExecuteResult<T>> {
  switch (options.tool) {
    case 'claude':
      return await executeClaudeCommand<T>(options as ClaudeExecuteOptions);
    case 'codex':
      return await executeCodexCommand<T>(options as CodexExecuteOptions);
    case 'gemini':
      return await executeGeminiCommand<T>(options as GeminiExecuteOptions);
    case 'cursor':
      throw new Error('Cursor execute not yet implemented');
    default: {
      const _exhaustive: never = options.tool;
      throw new Error(`Unknown tool: ${String(_exhaustive)}`);
    }
  }
}

export * from './types/unified';
export * from './claude/types';
// Codex types are available via codex namespace import, not re-exported here to avoid conflicts
export { extractTextContent } from './types/unified';

// Re-export utilities
export { extractJSON } from './utils/extractJson';
export { killProcess, type KillProcessOptions, type KillProcessResult } from './utils/kill';
export { detectCli as detectClaudeCli } from './claude/detectCli';
export { detectCli as detectCodexCli } from './codex/detectCli';
export { detectCli as detectGeminiCli } from './gemini/detectCli';
export { getCapabilities, type AgentType, type AgentCapabilities, type ModelInfo } from './utils/getCapabilities';

// Re-export permission types
export type { PermissionMode } from './types/permissions';
export type { BaseExecuteOptions, BaseExecuteCallbacks } from './types/execute';

// Re-export Claude execute types
export type {
  ExecuteOptions as ClaudeExecuteOptions,
  ExecuteResult as ClaudeExecuteResult,
  OnEventData as ClaudeOnEventData,
  OnStdoutData as ClaudeOnStdoutData,
} from './claude/execute';

// Re-export Codex execute types
export type {
  ExecuteOptions as CodexExecuteOptions,
  ExecuteResult as CodexExecuteResult,
  OnEventData as CodexOnEventData,
  OnStdoutData as CodexOnStdoutData,
} from './codex/execute';

// Re-export Gemini execute types
export type { ExecuteOptions as GeminiExecuteOptions, ExecuteResult as GeminiExecuteResult } from './gemini/execute';
