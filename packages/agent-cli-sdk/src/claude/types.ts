export interface ClaudeEvent {
  type: 'user' | 'assistant' | 'file-history-snapshot';
  timestamp?: string;
  uuid?: string;
  sessionId?: string;
  parentUuid?: string | null;
  cwd?: string;
  version?: string;
  gitBranch?: string;
  message?: ClaudeMessage;
  requestId?: string;
  isMeta?: boolean;
  userType?: 'external' | 'internal';
  isSidechain?: boolean;
  thinkingMetadata?: ThinkingMetadata;
  toolUseResult?: ToolUseResult;
}

export interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string | ContentBlock[];
  model?: string;
  id?: string;
  type?: 'message';
  stop_reason?: string | null;
  stop_sequence?: string | null;
  usage?: ClaudeUsage;
}

export interface ContentBlock {
  type: 'text' | 'tool_use' | 'tool_result' | 'thinking';
  text?: string;
  thinking?: string;
  tool_use_id?: string;
  content?: string;
  is_error?: boolean;
  id?: string;
  name?: string;
  input?: Record<string, unknown>;
}

export interface ClaudeUsage {
  input_tokens?: number;
  output_tokens?: number;
  cache_creation_input_tokens?: number;
  cache_read_input_tokens?: number;
  cache_creation?: {
    ephemeral_5m_input_tokens?: number;
    ephemeral_1h_input_tokens?: number;
  };
  service_tier?: string;
}

export interface ThinkingMetadata {
  level?: 'none' | 'low' | 'medium' | 'high';
  disabled?: boolean;
  triggers?: string[];
}

export interface ToolUseResult {
  type?: string;
  file?: {
    filePath: string;
    content: string;
    numLines: number;
    startLine: number;
    totalLines: number;
  };
  filePath?: string;
  oldString?: string;
  newString?: string;
}
