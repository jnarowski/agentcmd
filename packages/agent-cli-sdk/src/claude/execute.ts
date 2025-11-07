import type { UnifiedMessage } from '../types/unified';
import type { PermissionMode } from '../types/permissions';
import type { ChildProcess } from 'node:child_process';
import { spawnProcess } from '../utils/spawn';
import { extractJSON } from '../utils/extractJson';
import { parse } from './parse';
import { extractTextContent } from '../types/unified';
import { detectCli } from './detectCli';
import { createLineBuffer } from '../utils/lineBuffer';

// ============================================================================
// Types
// ============================================================================

/**
 * Internal event types used by Claude CLI
 * These are not exposed in the main API but used internally for parsing
 */
interface SystemInitEvent {
  type: 'system';
  subtype: 'init';
  session_id: string;
  cwd?: string;
  [key: string]: unknown;
}

interface ResultEvent {
  type: 'result';
  subtype?: string;
  result?: string;
  [key: string]: unknown;
}

type InternalEvent = SystemInitEvent | ResultEvent | Record<string, unknown>;

/**
 * Data provided to the onEvent callback.
 * Contains the raw JSONL line, parsed event, and unified message.
 */
export interface OnEventData {
  /** Raw JSONL line from CLI output */
  raw: string;
  /** Parsed event object */
  event: unknown;
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
  events: unknown[];
  /** All unified messages so far */
  messages: UnifiedMessage[];
}

/**
 * Options for executing a Claude CLI command.
 */
export interface ExecuteOptions {
  /** The prompt/instruction to send to Claude */
  prompt: string;
  /** Working directory for command execution (defaults to current directory) */
  workingDir?: string;
  /** Timeout in milliseconds (defaults to 5 minutes) */
  timeout?: number;
  /** Enable verbose output logging */
  verbose?: boolean;
  /** Unique session identifier (auto-generated if not provided) */
  sessionId?: string;
  /** Resume an existing session */
  resume?: boolean;
  /** Continue the current session */
  continue?: boolean;
  /** Claude model to use (e.g., 'claude-3-5-sonnet-20241022') */
  model?: string;
  /** Permission mode for file operations and command execution */
  permissionMode?: PermissionMode;
  /** Dangerously skip all permission checks (use with extreme caution) */
  dangerouslySkipPermissions?: boolean;
  /** Enable streaming mode */
  streaming?: boolean;
  /** Tool usage restrictions */
  toolSettings?: {
    /** List of allowed tool names */
    allowedTools?: string[];
    /** List of disallowed tool names */
    disallowedTools?: string[];
  };
  /** Images to include with the prompt */
  images?: Array<{ path: string }>;
  /** Automatically extract and parse JSON from the response */
  json?: boolean;
  /** Callback invoked immediately when process starts (before any output) */
  onStart?: (process: ChildProcess) => void;
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
 * Result of executing a Claude CLI command.
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
  /** Child process reference (for cancellation) */
  process?: ChildProcess;
}

// ============================================================================
// Public Functions
// ============================================================================

/**
 * Execute a Claude CLI command and return the complete result.
 *
 * Spawns a Claude CLI process with the specified options, monitors its output,
 * parses messages in real-time, and returns the complete execution result including
 * all messages, session info, and optionally extracted JSON data.
 *
 * @template T - Type of the extracted data (defaults to string, specify for JSON extraction)
 * @param options - Execution options including prompt, callbacks, and settings
 * @returns Promise resolving to the execution result with messages and data
 *
 * @throws {Error} If Claude CLI is not found or installation is invalid
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
    throw new Error('Claude CLI not found. Set CLAUDE_CLI_PATH or install Claude Code.');
  }

  const args = buildArgs(options);

  // Spawn process with line-by-line parsing
  const messages: UnifiedMessage[] = [];
  const events: unknown[] = [];
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
      timeout: options.timeout || 300000, // 5 minutes default
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
      data: extractData<T>(options, events, textOutput) as T,
      error: success ? undefined : stderr || 'Command failed',
      process: result.process,
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
      data: extractData<T>(options, events, textOutput) as T,
      error: stderr || errorMessage,
      process: undefined,
    };
  }
}

// ============================================================================
// Private Functions
// ============================================================================

/**
 * Process a single JSONL line from Claude CLI output
 */
function processLine(args: {
  line: string;
  events: unknown[];
  messages: UnifiedMessage[];
  options: ExecuteOptions;
}): void {
  const { line, events, messages, options } = args;

  if (!line.trim()) return;

  try {
    // Parse JSON event
    const event = JSON.parse(line);
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
  const args: string[] = [];

  // Programmatic mode (non-interactive)
  args.push('-p');

  // Model selection
  if (options.model) {
    args.push('--model', options.model);
  }

  // Session management (sessionId, continue, and resume are mutually exclusive)
  if (options.sessionId && options.resume) {
    // Resume an existing session with specific ID
    args.push('--resume', options.sessionId);
  } else if (options.sessionId) {
    // Create new session with specific ID
    args.push('--session-id', options.sessionId);
  } else if (options.continue) {
    args.push('--continue');
  }

  // Permission mode
  if (options.permissionMode) {
    args.push('--permission-mode', options.permissionMode);
  } else if (options.dangerouslySkipPermissions) {
    args.push('--permission-mode', 'bypassPermissions');
  }

  // Output format (stream-json requires --verbose)
  const useStreamJson = options.streaming !== false;
  if (useStreamJson) {
    args.push('--output-format', 'stream-json');
    args.push('--verbose'); // Required for stream-json
  } else if (options.verbose) {
    args.push('--verbose');
  }

  // Tool settings
  if (options.toolSettings?.allowedTools) {
    args.push('--allowed-tools', options.toolSettings.allowedTools.join(','));
  }

  if (options.toolSettings?.disallowedTools) {
    args.push('--disallowed-tools', options.toolSettings.disallowedTools.join(','));
  }

  // Images
  if (options.images && options.images.length > 0) {
    for (const image of options.images) {
      args.push('-i', image.path);
    }
  }

  // Prompt (must be last)
  args.push(options.prompt);

  return args;
}

/**
 * Extracts session ID from init event
 */
function extractSessionId(events: unknown[]): string {
  const initEvent = events.find((e) => {
    const event = e as InternalEvent;
    return 'type' in event && event.type === 'system' && 'subtype' in event && event.subtype === 'init';
  }) as SystemInitEvent | undefined;
  return initEvent?.session_id || 'unknown';
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
function extractData<T>(options: ExecuteOptions, events: unknown[], output: string): T | string {
  // If JSON not requested, return text output
  if (!options.json) {
    return output;
  }

  // Try to get output from result event first
  const resultEvent = events.find((e) => {
    const event = e as InternalEvent;
    return 'type' in event && event.type === 'result';
  }) as ResultEvent | undefined;
  const textToExtract = resultEvent?.result || output;

  if (!textToExtract) {
    return output;
  }

  const extracted = extractJSON(textToExtract);
  // Return extracted JSON if found, otherwise return original text
  return extracted !== null ? (extracted as T) : output;
}
