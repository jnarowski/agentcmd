/**
 * Standardized message format across different AI CLI tools.
 *
 * Represents a single message in a conversation, containing content blocks,
 * metadata, and usage statistics.
 */
export interface UnifiedMessage {
  /** Unique identifier for this message */
  id: string;
  /** Role of the message sender */
  role: 'user' | 'assistant' | 'system';
  /** Message content (text or structured content blocks) */
  content: string | UnifiedContent[];
  /** Unix timestamp in milliseconds */
  timestamp: number;
  /** AI tool that generated this message */
  tool: 'claude' | 'codex' | 'gemini' | 'cursor';
  /** Model identifier (e.g., 'claude-3-5-sonnet-20241022') */
  model?: string;
  /** Token usage statistics */
  usage?: {
    /** Number of input tokens consumed */
    inputTokens: number;
    /** Number of output tokens generated */
    outputTokens: number;
    /** Total tokens (input + output) */
    totalTokens: number;
    /** Tokens used for cache creation */
    cacheCreationTokens?: number;
    /** Tokens read from cache */
    cacheReadTokens?: number;
  };
  /** Original raw event data from the CLI tool */
  _original: unknown;
}

/**
 * Union type of all possible content block types in a unified message.
 */
export type UnifiedContent =
  | UnifiedTextBlock
  | UnifiedThinkingBlock
  | UnifiedToolUseBlock
  | UnifiedToolResultBlock
  | UnifiedSlashCommandBlock
  | UnifiedImageBlock;

/**
 * Text content block.
 */
export interface UnifiedTextBlock {
  type: 'text';
  /** The text content */
  text: string;
}

/**
 * Thinking/reasoning content block (Claude extended thinking).
 */
export interface UnifiedThinkingBlock {
  type: 'thinking';
  /** The thinking/reasoning content */
  thinking: string;
}

/**
 * Slash command content block (user-initiated commands).
 */
export interface UnifiedSlashCommandBlock {
  type: 'slash_command';
  /** Command name (e.g., 'commit', 'pull-request') */
  command: string;
  /** Optional command message/description */
  message?: string;
  /** Optional command arguments */
  args?: string;
}

/**
 * Image content block (base64-encoded image data).
 */
export interface UnifiedImageBlock {
  type: 'image';
  /** Base64-encoded image data */
  source: {
    type: 'base64';
    /** Base64 string of the image data */
    data: string;
    /** MIME type of the image (e.g., 'image/png', 'image/jpeg') */
    media_type: string;
  };
}

// Tool input types
export interface BashToolInput {
  command: string;
  description?: string;
  timeout?: number;
  run_in_background?: boolean;
  dangerouslyDisableSandbox?: boolean;
}

export interface ReadToolInput {
  file_path: string;
  offset?: number;
  limit?: number;
}

export interface WriteToolInput {
  file_path: string;
  content: string;
}

export interface EditToolInput {
  file_path: string;
  old_string: string;
  new_string: string;
  replace_all?: boolean;
}

export interface GlobToolInput {
  pattern: string;
  path?: string;
}

export interface GrepToolInput {
  pattern: string;
  output_mode?: 'content' | 'files_with_matches' | 'count';
  path?: string;
  glob?: string;
  type?: string;
  '-n'?: boolean;
  '-i'?: boolean;
  '-A'?: number;
  '-B'?: number;
  '-C'?: number;
  head_limit?: number;
  multiline?: boolean;
}

export interface TodoWriteToolInput {
  todos: Array<{
    content: string;
    status: 'pending' | 'in_progress' | 'completed';
    activeForm: string;
  }>;
}

export interface WebSearchToolInput {
  query: string;
  allowed_domains?: string[];
  blocked_domains?: string[];
}

export interface AskUserQuestionToolInput {
  questions: Array<{
    question: string;
    header: string;
    multiSelect: boolean;
    options: Array<{
      label: string;
      description: string;
    }>;
  }>;
}

export interface ExitPlanModeToolInput {
  plan: string;
}

export interface TaskToolInput {
  prompt: string;
  description: string;
  subagent_type: string;
  model?: string;
  resume?: string;
}

// MCP tools have dynamic names (e.g., mcp__happy__change_title)
// Keep as generic object for flexibility
export interface McpToolInput {
  [key: string]: unknown;
}

// Union type for all tool names
// Common Claude Code tools: Bash, Read, Write, Edit, Glob, Grep, TodoWrite, WebSearch, AskUserQuestion, ExitPlanMode
// Also supports MCP tools with dynamic names (mcp__*)
export type ToolName = string;

export interface UnifiedToolUseBlock {
  type: 'tool_use';
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface UnifiedToolResultBlock {
  type: 'tool_result';
  tool_use_id: string;
  content?: unknown;
  is_error?: boolean;
}

export function extractTextContent(message: UnifiedMessage): string {
  if (typeof message.content === 'string') {
    return message.content;
  }

  return message.content
    .filter((block) => block.type === 'text')
    .map((block) => {
      if (block.type === 'text') {
        return block.text;
      }
      return '';
    })
    .join('');
}

// Type guard functions for tool inputs
export function isBashTool(block: UnifiedToolUseBlock): block is UnifiedToolUseBlock & { input: BashToolInput } {
  return block.name === 'Bash';
}

export function isReadTool(block: UnifiedToolUseBlock): block is UnifiedToolUseBlock & { input: ReadToolInput } {
  return block.name === 'Read';
}

export function isWriteTool(block: UnifiedToolUseBlock): block is UnifiedToolUseBlock & { input: WriteToolInput } {
  return block.name === 'Write';
}

export function isEditTool(block: UnifiedToolUseBlock): block is UnifiedToolUseBlock & { input: EditToolInput } {
  return block.name === 'Edit';
}

export function isGlobTool(block: UnifiedToolUseBlock): block is UnifiedToolUseBlock & { input: GlobToolInput } {
  return block.name === 'Glob';
}

export function isGrepTool(block: UnifiedToolUseBlock): block is UnifiedToolUseBlock & { input: GrepToolInput } {
  return block.name === 'Grep';
}

export function isTodoWriteTool(
  block: UnifiedToolUseBlock
): block is UnifiedToolUseBlock & { input: TodoWriteToolInput } {
  return block.name === 'TodoWrite';
}

export function isWebSearchTool(
  block: UnifiedToolUseBlock
): block is UnifiedToolUseBlock & { input: WebSearchToolInput } {
  return block.name === 'WebSearch';
}

export function isAskUserQuestionTool(
  block: UnifiedToolUseBlock
): block is UnifiedToolUseBlock & { input: AskUserQuestionToolInput } {
  return block.name === 'AskUserQuestion';
}

export function isExitPlanModeTool(
  block: UnifiedToolUseBlock
): block is UnifiedToolUseBlock & { input: ExitPlanModeToolInput } {
  return block.name === 'ExitPlanMode';
}

export function isMcpTool(block: UnifiedToolUseBlock): block is UnifiedToolUseBlock & { input: McpToolInput } {
  return block.name.startsWith('mcp__');
}

export function isSlashCommand(block: UnifiedContent): block is UnifiedSlashCommandBlock {
  return block.type === 'slash_command';
}

/**
 * Extracts session ID from array of events
 *
 * @param events - Array of events with optional sessionId property
 * @returns Session ID or 'unknown' if not found
 */
export function extractSessionIdFromEvents<T extends { sessionId?: string }>(events: T[]): string {
  for (const event of events) {
    if (event.sessionId) {
      return event.sessionId;
    }
  }
  return 'unknown';
}
