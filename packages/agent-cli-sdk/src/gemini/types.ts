/**
 * Gemini-specific types for parsing session files.
 *
 * These types are INPUT-ONLY - they are used to parse incoming JSON from Gemini session files
 * and type the `_original` field. All output should use UnifiedMessage types from types/unified.ts.
 */

// ============================================================================
// Session File Structure
// ============================================================================

/**
 * Complete Gemini session file structure.
 * Unlike Claude/Codex (streaming JSONL), Gemini stores sessions as complete JSON objects.
 */
export interface GeminiSession {
  sessionId: string;
  projectHash: string;
  startTime: string;
  lastUpdated: string;
  messages: GeminiMessage[];
}

// ============================================================================
// Message Structure
// ============================================================================

export interface GeminiMessage {
  id: string;
  timestamp: string;
  type: 'user' | 'gemini';
  content: string;
  toolCalls?: GeminiToolCall[];
  thoughts?: GeminiThought[];
  tokens?: GeminiTokens;
  model?: string;
}

// ============================================================================
// Tool Call Structure
// ============================================================================

export interface GeminiToolCall {
  id: string;
  name: string;
  args: Record<string, unknown>;
  /** Tool result is embedded in the toolCall (not a separate event) */
  result?: GeminiFunctionResponse[];
  status?: 'success' | 'error' | 'cancelled';
  timestamp?: string;
  displayName?: string;
  description?: string;
  resultDisplay?: string;
  renderOutputAsMarkdown?: boolean;
}

/**
 * Gemini wraps tool results in a nested structure
 */
export interface GeminiFunctionResponse {
  functionResponse: {
    id: string;
    name: string;
    response: {
      output?: string;
      error?: string;
    };
  };
}

// ============================================================================
// Thoughts Structure
// ============================================================================

/**
 * Gemini stores thoughts as a separate array (not inline thinking blocks)
 */
export interface GeminiThought {
  subject: string;
  description: string;
  timestamp: string;
}

// ============================================================================
// Token Usage
// ============================================================================

export interface GeminiTokens {
  input: number;
  output: number;
  cached: number;
  thoughts: number;
  tool: number;
  total: number;
}
