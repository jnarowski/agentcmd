import { create } from "zustand";
import type { UnifiedMessage, UnifiedContent, UnifiedImageBlock, PermissionMode } from 'agent-cli-sdk';
import type { UIMessage } from '@/shared/types/message.types';
import type {
  AgentSessionMetadata,
  SessionResponse,
} from "@/shared/types/agent-session.types";
import type { AgentType } from "@/shared/types/agent.types";
import { api } from "@/client/utils/api";
import type { ProjectWithSessions } from "@/shared/types/project.types";
import { projectKeys } from "@/client/pages/projects/hooks/useProjects";
import { isSystemMessage } from '@/shared/utils/message.utils';

/**
 * Parse tool result content and auto-convert images to UnifiedImageBlock objects.
 *
 * **Special Case for Images:** Images are stored as stringified JSON arrays in JSONL files
 * but need to be parsed back to structured objects for the ImageBlock component. This
 * function handles that conversion automatically.
 *
 * **Other Content Types:** All other content (including JSON answers, plain text, etc.)
 * is preserved as strings and should be parsed by the individual tool renderers.
 *
 * @param content - Raw tool result content from JSONL (string, array, or object)
 * @returns Parsed content - UnifiedImageBlock for images, string for everything else
 *
 * @example
 * // Image content (stringified in JSONL)
 * tryParseImageContent('[{"type":"image","source":{...}}]')
 * // Returns: { type: 'image', source: {...} }
 *
 * @example
 * // Plain text content
 * tryParseImageContent('Command executed successfully')
 * // Returns: 'Command executed successfully'
 *
 * @example
 * // JSON content (not an image)
 * tryParseImageContent('{"answers":{"q1":"a1"}}')
 * // Returns: '{"answers":{"q1":"a1"}}' (unchanged - parse in component)
 */
function tryParseImageContent(content: unknown): string | UnifiedImageBlock {
  // If already a string, try to parse it as JSON
  if (typeof content === 'string') {
    try {
      const parsed = JSON.parse(content);
      // Check if it's an array with an image object
      if (Array.isArray(parsed) && parsed.length > 0 && parsed[0]?.type === 'image') {
        return parsed[0] as UnifiedImageBlock;
      }
      // Not an image, return stringified
      return content;
    } catch {
      // Not valid JSON, return as-is
      return content;
    }
  }

  // If it's an array, check if first item is an image
  if (Array.isArray(content) && content.length > 0 && content[0]?.type === 'image') {
    return content[0] as UnifiedImageBlock;
  }

  // For any other type, stringify it
  return JSON.stringify(content);
}

/**
 * Enrich messages by nesting tool_result blocks into their corresponding tool_use blocks.
 * This is the ONLY transform on the frontend - happens once when loading messages.
 *
 * **Core Pattern:** All tool results are matched to tool invocations via tool_use_id using
 * a Map-based lookup. This ensures O(1) matching performance and enables components to
 * receive enriched data without manual searching.
 *
 * For complete documentation on the tool result matching pattern, see:
 * `.agent/docs/claude-tool-result-patterns.md`
 *
 * Process:
 * 1. Filter out messages containing only system content (caveats, command tags, etc.)
 * 2. Build Map of tool_use_id → result from all tool_result blocks (O(n) scan)
 * 3. Nest results into corresponding tool_use blocks (O(1) lookup per tool)
 * 4. Filter out standalone tool_result blocks (now nested in tool_use)
 * 5. Add isStreaming: false to all loaded messages
 *
 * **Important:** User messages containing ONLY tool_result blocks are removed entirely
 * after enrichment, since their content is now nested in the assistant's tool_use block.
 *
 * @param messages - Array of UnifiedMessages from JSONL parsing
 * @returns Array of UIMessages with nested tool results and isStreaming flags
 *
 * @example
 * // Input: Array of UnifiedMessages with separate tool_use and tool_result blocks
 * [
 *   {
 *     id: '1',
 *     role: 'assistant',
 *     content: [
 *       { type: 'text', text: 'Let me read the file' },
 *       { type: 'tool_use', id: 'tool_abc123', name: 'Read', input: { file_path: '/src/index.ts' } }
 *     ],
 *     timestamp: 1234567890
 *   },
 *   {
 *     id: '2',
 *     role: 'user',
 *     content: [
 *       { type: 'tool_result', tool_use_id: 'tool_abc123', content: 'export const foo = "bar";' }
 *     ],
 *     timestamp: 1234567891
 *   }
 * ]
 *
 * // Output: tool_result nested inside tool_use, standalone tool_result filtered out
 * [
 *   {
 *     id: '1',
 *     role: 'assistant',
 *     content: [
 *       { type: 'text', text: 'Let me read the file' },
 *       {
 *         type: 'tool_use',
 *         id: 'tool_abc123',
 *         name: 'Read',
 *         input: { file_path: '/src/index.ts' },
 *         result: { content: 'export const foo = "bar";', is_error: false }  // Nested result
 *       }
 *     ],
 *     timestamp: 1234567890,
 *     isStreaming: false
 *   }
 *   // Note: Message '2' with standalone tool_result is now filtered out
 * ]
 */
function enrichMessagesWithToolResults(messages: (UnifiedMessage | UIMessage)[]): UIMessage[] {
  const initialCount = messages.length;

  // Step 1: Filter out messages with only system content
  const filteredMessages = messages.filter((msg) => {
    const content = msg.content;

    // If content is a string, check if it's a system message
    if (typeof content === 'string') {
      const isSystem = isSystemMessage(content);
      if (isSystem) {
        console.log(`[ENRICH] Message ${msg.id} filtered - system content only (string)`);
      }
      return !isSystem;
    }

    // If content is an array, check if all text blocks are system messages
    if (Array.isArray(content)) {
      const textBlocks = content.filter(c => c.type === 'text');

      // If no text blocks, keep the message (has other content like tools)
      if (textBlocks.length === 0) {
        return true;
      }

      // Filter out messages where ALL text blocks are system messages
      const allSystemMessages = textBlocks.every(c => isSystemMessage(c.text));
      if (allSystemMessages) {
        console.log(`[ENRICH] Message ${msg.id} filtered - all text blocks are system messages`);
      }
      return !allSystemMessages;
    }

    // Keep messages with other content types
    return true;
  });

  // Step 2: Build lookup map of tool results
  const resultMap = new Map<string, { content: string | UnifiedImageBlock; is_error?: boolean }>();
  const allToolUseIds = new Set<string>();

  // First pass: collect all tool_use IDs
  for (const message of filteredMessages) {
    if (Array.isArray(message.content)) {
      for (const block of message.content) {
        if (block.type === 'tool_use') {
          allToolUseIds.add(block.id);
        }
      }
    }
  }

  // Second pass: build result map and log orphaned results
  for (const message of filteredMessages) {
    if (Array.isArray(message.content)) {
      for (const block of message.content) {
        if (block.type === 'tool_result') {
          if (!allToolUseIds.has(block.tool_use_id)) {
            console.log(`[ENRICH] Tool_result ${block.tool_use_id} - no matching tool_use`);
          }
          resultMap.set(block.tool_use_id, {
            content: tryParseImageContent(block.content),
            is_error: block.is_error
          });
        }
      }
    }
  }

  // Step 3: Enrich tool_use blocks and filter out tool_result blocks
  const enrichedMessages = filteredMessages.map((msg) => {
    // Direct pass-through of _original from SDK (not nested UnifiedMessage)
    const _original = import.meta.env.DEV ? msg : undefined;

    // Extract flattened fields from _original
    const parentId = '_original' in msg && msg._original && typeof msg._original === 'object' && 'parentUuid' in msg._original
      ? (msg._original.parentUuid as string | null)
      : undefined;
    const sessionId = '_original' in msg && msg._original && typeof msg._original === 'object' && 'sessionId' in msg._original
      ? (msg._original.sessionId as string)
      : undefined;

    // Check if msg has isStreaming property (UIMessage) or default to false
    const isStreaming = ('isStreaming' in msg && typeof msg.isStreaming === 'boolean') ? msg.isStreaming : false;

    if (!Array.isArray(msg.content)) {
      return { ...msg, isStreaming, _original, parentId, sessionId };
    }

    const enrichedContent = msg.content
      .map((block) => {
        // Nest result into tool_use block
        if (block.type === 'tool_use') {
          const result = resultMap.get(block.id);
          return result ? { ...block, result } : block;
        }
        return block;
      })
      // Filter out standalone tool_result blocks (now nested in tool_use)
      .filter((block) => {
        if (block.type === 'tool_result') {
          return false;
        }
        return true;
      });

    // Log empty content blocks
    if (Array.isArray(msg.content)) {
      const emptyBlocks = msg.content.filter((block) => {
        if (typeof block === 'string') return (block as string).trim() === '';
        if (typeof block === 'object' && block !== null && 'type' in block && block.type === 'text' && 'text' in block) {
          const textBlock = block as { text: string };
          return !textBlock.text || textBlock.text.trim() === '';
        }
        return false;
      });
      if (emptyBlocks.length > 0) {
        console.log(`[ENRICH] Message ${msg.id} has ${msg.content.length} blocks, ${emptyBlocks.length} empty`);
      }
    }

    return {
      ...msg,
      content: enrichedContent,
      isStreaming,
      _original,
      parentId,
      sessionId
    } as UIMessage;
  });

  // Filter out messages with empty content arrays (tool_result-only messages after enrichment)
  const finalMessages = enrichedMessages.filter((msg) => {
    // Keep messages with non-array content (edge case)
    if (!Array.isArray(msg.content)) return true;

    // Filter out empty content arrays (user messages with only tool_result blocks)
    if (msg.content.length === 0) {
      console.log(`[ENRICH] Message ${msg.id} filtered - empty content array after enrichment (only tool_result)`);
      return false;
    }

    return true;
  });

  // Log enrichment summary
  const filteredCount = initialCount - finalMessages.length;
  console.log(`[ENRICH] ${initialCount} messages → ${finalMessages.length} after enrichment (${filteredCount} filtered)`);

  return finalMessages;
}

/**
 * Loading states for async operations
 */
export type LoadingState = "idle" | "loading" | "loaded" | "error";

/**
 * Prompt input form state
 * Tracks the current state of the prompt input form
 */
export interface FormState {
  permissionMode: PermissionMode;
  agent: AgentType;
  model: string;
}

/**
 * Session data structure
 * Tracks all state for the current session
 */
export interface SessionData {
  id: string;
  name?: string; // AI-generated session name
  agent: AgentType;
  messages: UIMessage[];
  isStreaming: boolean;
  metadata: AgentSessionMetadata | null;
  loadingState: LoadingState;
  error: string | null;
}

/**
 * SessionStore state and actions
 * Manages a single current session (not a Map)
 */
export interface SessionStore {
  // State
  sessionId: string | null;
  session: SessionData | null;
  form: FormState;

  // Session lifecycle actions
  loadSession: (sessionId: string, projectId: string, queryClient?: { getQueryData: (key: unknown) => unknown }) => Promise<void>;
  clearSession: () => void;

  // Message actions
  addMessage: (message: UIMessage) => void;
  updateStreamingMessage: (messageId: string, contentBlocks: UnifiedContent[]) => void;
  finalizeMessage: (messageId: string) => void;

  // State actions
  setStreaming: (isStreaming: boolean) => void;
  updateMetadata: (metadata: Partial<AgentSessionMetadata>) => void;
  setError: (error: string | null) => void;
  setLoadingState: (state: LoadingState) => void;

  // Permission mode actions
  setPermissionMode: (mode: PermissionMode) => void;
  getPermissionMode: () => PermissionMode;

  // Agent selection actions
  setAgent: (agent: AgentType) => void;
  getAgent: () => AgentType;

  // Model selection actions
  setModel: (model: string) => void;
  getModel: () => string;

  // Initialize defaults from user settings
  initializeFromSettings: (settings: { permissionMode?: PermissionMode; agent?: AgentType }) => void;
}

/**
 * Session store - manages the current session
 */
export const useSessionStore = create<SessionStore>((set, get) => ({
  // Initial state
  sessionId: null,
  session: null,
  form: {
    permissionMode: "acceptEdits",
    agent: "claude",
    model: "",
  },

  // Load session from server
  loadSession: async (sessionId: string, projectId: string, queryClient?: { getQueryData: (key: unknown) => unknown }) => {
    try {
      let session: SessionResponse | undefined;

      // Try to get session from React Query cache first
      if (queryClient) {
        const cachedProjects = queryClient.getQueryData(projectKeys.withSessions()) as ProjectWithSessions[] | undefined;

        if (cachedProjects) {
          const project = cachedProjects.find((p) => p.id === projectId);
          session = project?.sessions?.find((s) => s.id === sessionId);
        }
      }

      // If not in cache, fetch session metadata directly from API
      if (!session) {
        try {
          const data = await api.get<{ data: SessionResponse }>(
            `/api/projects/${projectId}/sessions/${sessionId}`
          );
          session = data.data;
        } catch (error) {
          throw new Error(`Session not found: ${sessionId}. ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // Set loading state with agent type and metadata
      set({
        sessionId: sessionId,
        session: {
          id: sessionId,
          agent: session.agent,
          messages: [],
          isStreaming: false,
          metadata: session.metadata || null,
          loadingState: "loading",
          error: null,
        },
      });

      // Now fetch messages
      let rawMessages: UnifiedMessage[] = [];
      try {
        const data = await api.get<{ data: UnifiedMessage[] }>(
          `/api/projects/${projectId}/sessions/${sessionId}/messages`
        );
        rawMessages = data.data || [];
      } catch (error) {
        // JSONL file doesn't exist yet - this is expected for new sessions
        if (error && typeof error === 'object' && 'statusCode' in error && error.statusCode === 404) {
          set((state) => ({
            session: state.session
              ? { ...state.session, loadingState: "loaded" }
              : null,
          }));
          return;
        }
        throw error;
      }

      // Enrich messages with nested tool results
      const messages = enrichMessagesWithToolResults(rawMessages);

      set((state) => ({
        session: state.session
          ? {
              ...state.session,
              messages,
              loadingState: "loaded",
            }
          : null,
      }));
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to load session";
      console.error(`[sessionStore] Error loading session:`, errorMessage);
      set((state) => ({
        session: state.session
          ? {
              ...state.session,
              loadingState: "error",
              error: errorMessage,
            }
          : null,
      }));
      throw error;
    }
  },

  // Clear current session
  clearSession: () => {
    set({
      sessionId: null,
      session: null,
    });
  },

  // Add a message to the current session
  addMessage: (message: UIMessage) => {
    set((state) => {
      if (!state.session) return state;

      return {
        session: {
          ...state.session,
          messages: [...state.session.messages, message],
        },
      };
    });
  },

  // Update the streaming message content
  // Receives UnifiedContent[] blocks from streaming updates
  updateStreamingMessage: (messageId: string, contentBlocks: UnifiedContent[]) => {
    set((state) => {
      if (!state.session) {
        return state;
      }

      const messages = state.session.messages;
      const lastMessage = messages[messages.length - 1];

      // Check if last message has the same ID (update existing message)
      const shouldUpdateLastMessage =
        lastMessage &&
        lastMessage.role === "assistant" &&
        lastMessage.isStreaming === true &&
        lastMessage.id === messageId;

      let updatedMessages: UIMessage[];

      if (shouldUpdateLastMessage) {
        // Update existing streaming message with same ID immutably
        // Preserve _original from when message was first created
        const _original = import.meta.env.DEV
          ? (lastMessage._original || { ...lastMessage })
          : undefined;

        updatedMessages = [
          ...messages.slice(0, -1),
          {
            ...lastMessage,
            content: contentBlocks,
            _original,
            // parentId and sessionId remain unchanged from initial message
          },
        ];
      } else {
        // Create new streaming assistant message with the provided ID
        const newMessage: UIMessage = {
          id: messageId,
          role: "assistant" as const,
          content: contentBlocks,
          timestamp: Date.now(),
          tool: 'claude' as const, // Default tool for new streaming messages
          isStreaming: true,
          _original: undefined, // Will be set if needed for debugging
          parentId: undefined, // Streaming messages don't have parent relationships yet
          sessionId: undefined, // Streaming messages don't have session IDs yet
        };

        // Capture _original for new streaming messages (dev only)
        // Store the message itself as _original for debugging
        if (import.meta.env.DEV) {
          newMessage._original = { ...newMessage };
        }

        updatedMessages = [
          ...messages,
          newMessage,
        ];
      }

      // Don't apply enrichment during streaming - it filters/modifies messages
      // Enrichment only happens when loading existing messages from server
      return {
        session: {
          ...state.session,
          messages: updatedMessages,
          isStreaming: true,
        },
      };
    });
  },

  // Finalize the streaming message
  finalizeMessage: (messageId: string) => {
    set((state) => {
      if (!state.session) return state;

      console.log('[finalizeMessage] Called for messageId:', messageId);
      console.log('[finalizeMessage] Current message count:', state.session.messages.length);

      // Mark messages as no longer streaming
      const messages = state.session.messages.map((msg) =>
        msg.id === messageId || msg.isStreaming
          ? { ...msg, isStreaming: false }
          : msg
      );

      console.log('[finalizeMessage] Messages before enrichment:', messages.length);
      console.log('[finalizeMessage] Message roles:', messages.map(m => `${m.role}(${m.content.length})`).join(', '));

      // Apply enrichment to nest tool results and filter empty messages
      // This matches the behavior when loading saved sessions
      const enrichedMessages = enrichMessagesWithToolResults(messages);

      console.log('[finalizeMessage] Messages after enrichment:', enrichedMessages.length);
      console.log('[finalizeMessage] Enriched roles:', enrichedMessages.map(m => `${m.role}(${m.content.length})`).join(', '));

      return {
        session: {
          ...state.session,
          messages: enrichedMessages,
          isStreaming: false,
        },
      };
    });
  },

  // Set streaming state
  setStreaming: (isStreaming: boolean) => {
    set((state) => ({
      session: state.session
        ? { ...state.session, isStreaming }
        : null,
    }));
  },

  // Update metadata
  updateMetadata: (metadata: Partial<AgentSessionMetadata>) => {
    set((state) => {
      if (!state.session) return state;

      return {
        session: {
          ...state.session,
          metadata: {
            ...(state.session.metadata || {
              totalTokens: 0,
              messageCount: 0,
              lastMessageAt: "",
              firstMessagePreview: "",
            }),
            ...metadata,
          } as AgentSessionMetadata,
        },
      };
    });
  },

  // Set error state
  setError: (error: string | null) => {
    set((state) => ({
      session: state.session
        ? { ...state.session, error }
        : null,
    }));
  },

  // Set loading state
  setLoadingState: (loadingState: LoadingState) => {
    set((state) => ({
      session: state.session
        ? { ...state.session, loadingState }
        : null,
    }));
  },

  // Set permission mode in form
  setPermissionMode: (mode: PermissionMode) => {
    set((state) => ({
      form: {
        ...state.form,
        permissionMode: mode,
      },
    }));
  },

  // Get permission mode from form
  getPermissionMode: () => {
    const state = get();
    return state.form.permissionMode;
  },

  // Set agent in form
  setAgent: (agent: AgentType) => {
    set((state) => ({
      form: {
        ...state.form,
        agent,
      },
    }));
  },

  // Get agent from form
  getAgent: () => {
    const state = get();
    return state.form.agent;
  },

  // Set model in form
  setModel: (model: string) => {
    set((state) => ({
      form: {
        ...state.form,
        model,
      },
    }));
  },

  // Get model from form
  getModel: () => {
    const state = get();
    return state.form.model;
  },

  // Initialize defaults from user settings
  initializeFromSettings: (settings) => {
    set((state) => ({
      form: {
        ...state.form,
        ...(settings.permissionMode && { permissionMode: settings.permissionMode }),
        ...(settings.agent && { agent: settings.agent }),
      },
    }));
  },
}));

/**
 * Memoized selector to calculate total tokens from all assistant messages
 *
 * Token counting methodology:
 * - input_tokens: Fresh input tokens (non-cached)
 * - output_tokens: Model's generated response
 *
 * Note: Cache-related tokens (cache_creation_input_tokens, cache_read_input_tokens)
 * are NOT counted here as they represent optimization metrics, not actual token usage.
 * Only counting the "new" tokens actually processed.
 */
export const selectTotalTokens = (state: SessionStore): number => {
  if (!state.session?.messages) return 0;

  return state.session.messages.reduce((total, message) => {
    // Only count assistant messages that have usage data
    if (message.role !== "assistant" || !message.usage) {
      return total;
    }

    const usage = message.usage;
    return (
      total +
      (usage.inputTokens || 0) +
      (usage.outputTokens || 0)
      // Note: NOT counting cache tokens - those are optimization metrics
    );
  }, 0);
};
