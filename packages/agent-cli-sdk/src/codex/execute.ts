import type { UnifiedMessage } from '../types/unified';
import type { PermissionMode } from '../types/permissions';
import { spawnProcess } from '../utils/spawn';
import { extractJSON } from '../utils/extractJson';
import { parse } from './parse';
import { extractTextContent } from '../types/unified';
import { detectCli } from './detectCli';
import type { CodexEvent } from './types';
import { createLineBuffer } from '../utils/lineBuffer';

// ============================================================================
// Types
// ============================================================================

/**
 * Data provided to the onEvent callback.
 * Contains the raw JSONL line, parsed event, and unified message.
 */
export interface OnEventData {
  /** Raw JSONL line from CLI output */
  raw: string;
  /** Parsed event object */
  event: CodexEvent;
  /** Unified message (null if event is not a message) */
  message: UnifiedMessage | null;
}

/**
 * Data provided to the onStdout callback.
 * Contains accumulated output data.
 */
export interface OnStdoutData {
  /** Raw accumulated output */
  raw: string;
  /** All parsed events so far */
  events: CodexEvent[];
  /** All unified messages so far */
  messages: UnifiedMessage[];
}

/**
 * Options for executing a Codex CLI command.
 */
export interface ExecuteOptions {
  /** The prompt/instruction to send to Codex */
  prompt: string;
  /** Working directory for command execution (defaults to current directory) */
  workingDir?: string;
  /** Timeout in milliseconds (optional, no default) */
  timeout?: number;
  /** Enable verbose output logging */
  verbose?: boolean;
  /** Unique session identifier (for resuming sessions) */
  sessionId?: string;
  /** Codex model to use */
  model?: string;
  /** Permission mode for file operations and command execution */
  permissionMode?: PermissionMode;
  /** Dangerously skip all permission checks (use with extreme caution) */
  dangerouslySkipPermissions?: boolean;
  /** Automatically extract and parse JSON from the response */
  json?: boolean;
  /** Callback invoked immediately when process starts (before any output) */
  onStart?: (process: import('node:child_process').ChildProcess) => void;
  /**
   * Callback invoked for each event received from the CLI.
   * Provides raw JSONL line, parsed event, and unified message.
   */
  onEvent?: (data: OnEventData) => void;
  /**
   * Callback invoked with accumulated output data.
   * Provides raw output, all events, and all messages so far.
   */
  onStdout?: (data: OnStdoutData) => void;
  /** Callback invoked when stderr data is received */
  onStderr?: (chunk: string) => void;
  /** Callback invoked when an error occurs */
  onError?: (error: Error) => void;
  /** Callback invoked when the process closes */
  onClose?: (exitCode: number) => void;
}

/**
 * Result of executing a Codex CLI command.
 * @template T - Type of the extracted data (string by default, or parsed JSON type)
 */
export interface ExecuteResult<T = string> {
  /** Whether the command completed successfully */
  success: boolean;
  /** Exit code from the CLI process */
  exitCode: number;
  /** Session identifier for this execution */
  sessionId: string;
  /** Duration of execution in milliseconds */
  duration: number;
  /** All messages exchanged during execution */
  messages: UnifiedMessage[];
  /** Extracted data (text or parsed JSON) */
  data: T;
  /** Error message if execution failed */
  error?: string;
}

// ============================================================================
// Public Functions
// ============================================================================

/**
 * Execute a Codex CLI command and return the complete result.
 *
 * Spawns a Codex CLI process with the specified options, monitors its output,
 * parses messages in real-time, and returns the complete execution result including
 * all messages, session info, and optionally extracted JSON data.
 *
 * @template T - Type of the extracted data (defaults to string, specify for JSON extraction)
 * @param options - Execution options including prompt, callbacks, and settings
 * @returns Promise resolving to the execution result with messages and data
 *
 * @throws {Error} If Codex CLI is not found or installation is invalid
 *
 * @example
 * ```typescript
 * // Basic execution
 * const result = await execute({
 *   prompt: 'List TypeScript files',
 *   workingDir: '/path/to/project',
 *   verbose: true
 * });
 * console.log('Output:', result.data);
 *
 * // With JSON extraction
 * interface FileList { files: string[] }
 * const result = await execute<FileList>({
 *   prompt: 'List all .ts files as JSON',
 *   json: true
 * });
 * console.log('Files:', result.data.files);
 *
 * // With real-time callbacks
 * const result = await execute({
 *   prompt: 'Refactor this code',
 *   onEvent: ({ message }) => {
 *     if (message?.role === 'assistant') {
 *       console.log('Assistant:', message.content);
 *     }
 *   }
 * });
 * ```
 */
export async function execute<T = string>(options: ExecuteOptions): Promise<ExecuteResult<T>> {
  const cliPath = await detectCli();
  if (!cliPath) {
    throw new Error('Codex CLI not found. Set CODEX_CLI_PATH or install Codex CLI.');
  }

  const args = buildArgs(options);

  // Spawn process with line-by-line parsing
  const messages: UnifiedMessage[] = [];
  const events: CodexEvent[] = [];
  let rawOutput = '';
  let stderr = '';
  const startTime = Date.now();

  // Create line buffer for streaming JSONL
  const lineBuffer = createLineBuffer((line) => {
    processLine({ line, events, messages, options });
  });

  try {
    const result = await spawnProcess(cliPath, {
      args,
      cwd: options.workingDir,
      timeout: options.timeout,
      verbose: options.verbose,
      onStart: options.onStart,
      onStdout: (chunk) => {
        rawOutput += chunk;
        lineBuffer.add(chunk);

        // Call onStdout callback with accumulated data
        options.onStdout?.({
          raw: rawOutput,
          events,
          messages,
        });
      },
      onStderr: (chunk) => {
        stderr += chunk;
        options.onStderr?.(chunk);
      },
      onError: (error) => {
        options.onError?.(error);
      },
      onClose: (exitCode) => {
        options.onClose?.(exitCode);
      },
    });

    const textOutput = extractOutput(messages);
    const success = result.exitCode === 0;

    return {
      success,
      exitCode: result.exitCode,
      sessionId: extractSessionId(events),
      duration: result.duration,
      messages,
      data: extractData<T>(options, textOutput) as T,
      error: success ? undefined : stderr || 'Command failed',
    };
  } catch (error) {
    // Handle timeout and other errors gracefully
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const textOutput = extractOutput(messages);

    return {
      success: false,
      exitCode: -1,
      sessionId: extractSessionId(events),
      duration,
      messages,
      data: extractData<T>(options, textOutput) as T,
      error: stderr || errorMessage,
    };
  }
}

// ============================================================================
// Private Functions
// ============================================================================

/**
 * Process a single JSONL line from Codex CLI output
 */
function processLine(args: {
  line: string;
  events: CodexEvent[];
  messages: UnifiedMessage[];
  options: ExecuteOptions;
}): void {
  const { line, events, messages, options } = args;

  if (!line.trim()) return;

  try {
    // Parse JSON event
    const event = JSON.parse(line) as CodexEvent;
    events.push(event);

    // Parse as UnifiedMessage
    const message = parse(line);
    if (message) {
      messages.push(message);
    }

    // Call onEvent callback with raw line, parsed event, and parsed message
    options.onEvent?.({
      raw: line,
      event,
      message,
    });
  } catch {
    // Skip invalid JSON lines
  }
}

/**
 * Builds CLI arguments from options
 */
function buildArgs(options: ExecuteOptions): string[] {
  const args: string[] = ['exec'];

  // IMPORTANT: --json must come before any subcommands (like resume)
  args.push('--json');

  // Model selection (must come before subcommands)
  if (options.model) {
    args.push('-m', options.model);
  }

  // Working directory (must come before subcommands)
  if (options.workingDir) {
    args.push('-C', options.workingDir);
    // Add --skip-git-repo-check when using custom working directory
    args.push('--skip-git-repo-check');
  }

  // Permission mode (mapped to Codex flags)
  if (options.dangerouslySkipPermissions) {
    args.push('--dangerously-bypass-approvals-and-sandbox');
  } else if (options.permissionMode) {
    const modeArgs = mapPermissionMode(options.permissionMode);
    args.push(...modeArgs);
  } else {
    // Default: workspace-write sandbox
    args.push('-s', 'workspace-write');
  }

  // Session management (subcommand, must come after flags)
  if (options.sessionId) {
    args.push('resume', options.sessionId);
  }

  // Prompt (must be last)
  args.push(options.prompt);

  return args;
}

/**
 * Map permission mode to Codex flags.
 */
function mapPermissionMode(mode: PermissionMode): string[] {
  switch (mode) {
    case 'bypassPermissions':
      return ['--dangerously-bypass-approvals-and-sandbox'];
    case 'acceptEdits':
      return ['--full-auto'];
    case 'plan':
      return ['-s', 'read-only'];
    case 'default':
    default:
      return ['-s', 'workspace-write'];
  }
}

/**
 * Extracts session ID from thread.started event
 */
function extractSessionId(events: CodexEvent[]): string {
  // Codex uses thread.started event with thread_id
  const threadStartedEvent = events.find((e) => e.type === 'thread.started') as { thread_id?: string } | undefined;

  if (threadStartedEvent?.thread_id) {
    return threadStartedEvent.thread_id;
  }

  return 'unknown';
}

/**
 * Extracts text output from assistant messages
 */
function extractOutput(messages: UnifiedMessage[]): string {
  return messages
    .filter((m) => m.role === 'assistant')
    .map((m) => extractTextContent(m))
    .join('\n');
}

/**
 * Extracts data from output
 * Returns text output by default, or parsed JSON when json is true
 */
function extractData<T>(options: ExecuteOptions, output: string): T | string {
  // If JSON not requested, return text output
  if (!options.json) {
    return output;
  }

  if (!output) {
    return output;
  }

  const extracted = extractJSON(output);
  // Return extracted JSON if found, otherwise return original text
  return extracted !== null ? (extracted as T) : output;
}
