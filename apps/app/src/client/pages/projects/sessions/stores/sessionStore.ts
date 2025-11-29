import { create } from "zustand";
import { api } from "@/client/utils/api";
import type { UnifiedMessage, UnifiedContent, UnifiedImageBlock, PermissionMode } from 'agent-cli-sdk';
import type { UIMessage } from '@/shared/types/message.types';
import type { AgentSessionMetadata, SessionType, SessionResponse } from "@/shared/types/agent-session.types";
import type { AgentType } from "@/shared/types/agent.types";
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
export function enrichMessagesWithToolResults(messages: (UnifiedMessage | UIMessage)[]): UIMessage[] {
  // Step 1: Filter out messages with only system content
  const filteredMessages = messages.filter((msg) => {
    const content = msg.content;

    // If content is a string, check if it's a system message
    if (typeof content === 'string') {
      return !isSystemMessage(content);
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

  // Second pass: build result map
  for (const message of filteredMessages) {
    if (Array.isArray(message.content)) {
      for (const block of message.content) {
        if (block.type === 'tool_result') {
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
    return msg.content.length > 0;
  });

  return finalMessages;
}

/**
 * Merge in-memory messages with server messages using content-based matching.
 *
 * **Problem:** Client generates optimistic user messages with random UUIDs while CLI
 * generates `msg_{hash}` IDs. These never match, so ID-based deduplication fails.
 *
 * **Solution:** Match optimistic user messages to server messages by exact content comparison.
 * Replace matched optimistic with authoritative server version. Keep unmatched optimistic
 * (orphaned due to CLI delay/crash). Preserve streaming assistant messages.
 *
 * **Algorithm:**
 * 1. Extract optimistic user messages (have `_optimistic: true` flag)
 * 2. Extract streaming assistant messages (have `isStreaming: true`)
 * 3. For each optimistic message, find matching server message by content
 * 4. If matched: use server version (authoritative ID, timestamp, etc.)
 * 5. If not matched: keep optimistic (CLI hasn't written to disk yet or failed)
 * 6. Take all other server messages as source of truth
 * 7. Combine and sort by timestamp
 *
 * @param inMemoryMessages - Current messages in Zustand store (may have optimistic/streaming)
 * @param serverMessages - Messages from API (authoritative, already enriched)
 * @returns Merged messages array + updated messageIds Set for deduplication
 *
 * @example
 * // Optimistic message matched to server
 * mergeMessages(
 *   [{ id: 'uuid-123', role: 'user', content: [{type: 'text', text: 'hello'}], _optimistic: true }],
 *   [{ id: 'msg_abc', role: 'user', content: [{type: 'text', text: 'hello'}] }]
 * )
 * // Returns: { messages: [{ id: 'msg_abc', ... }], messageIds: Set(['msg_abc']) }
 *
 * @example
 * // Orphaned optimistic (CLI hasn't written yet)
 * mergeMessages(
 *   [{ id: 'uuid-123', role: 'user', content: [{type: 'text', text: 'hello'}], _optimistic: true }],
 *   []
 * )
 * // Returns: { messages: [{ id: 'uuid-123', ..., _optimistic: true }], messageIds: Set(['uuid-123']) }
 *
 * @example
 * // Preserve streaming
 * mergeMessages(
 *   [{ id: 'msg_123', role: 'assistant', content: [...], isStreaming: true }],
 *   []
 * )
 * // Returns: { messages: [{ id: 'msg_123', ..., isStreaming: true }], messageIds: Set(['msg_123']) }
 */
export function mergeMessages(
  inMemoryMessages: UIMessage[],
  serverMessages: UIMessage[]
): { messages: UIMessage[]; messageIds: Set<string> } {
  // Extract optimistic user messages (client-generated, may not be on server yet)
  const optimisticMessages = inMemoryMessages.filter(
    (msg) => msg._optimistic === true && msg.role === 'user'
  );

  // Extract streaming assistant messages (preserve streaming state)
  const streamingMessages = inMemoryMessages.filter(
    (msg) => msg.isStreaming === true && msg.role === 'assistant'
  );

  // Build content → server message lookup for matching
  const serverByContent = new Map<string, UIMessage>();
  for (const serverMsg of serverMessages) {
    if (serverMsg.role === 'user') {
      const contentKey = JSON.stringify(serverMsg.content);
      serverByContent.set(contentKey, serverMsg);
    }
  }

  // Match optimistic to server by content
  const matchedServerIds = new Set<string>();
  const mergedOptimistic: UIMessage[] = [];

  for (const optimisticMsg of optimisticMessages) {
    const contentKey = JSON.stringify(optimisticMsg.content);
    const serverMatch = serverByContent.get(contentKey);

    if (serverMatch) {
      // Matched: use server version (authoritative) but preserve images from optimistic
      // Images are stored client-side (base64) but not in JSONL, so we need to carry them over
      mergedOptimistic.push({
        ...serverMatch,
        images: optimisticMsg.images || serverMatch.images,
      });
      matchedServerIds.add(serverMatch.id);
    } else {
      // Orphaned: keep optimistic (CLI hasn't written or failed)
      mergedOptimistic.push(optimisticMsg);
    }
  }

  // Take all server messages except those already matched to optimistic
  const unmatchedServerMessages = serverMessages.filter(
    (msg) => !matchedServerIds.has(msg.id)
  );

  // Combine: matched optimistic (now server versions) + unmatched server + streaming
  const allMessages = [...mergedOptimistic, ...unmatchedServerMessages, ...streamingMessages];

  // Sort by timestamp (chronological order)
  const sortedMessages = allMessages.sort((a, b) => {
    const aTime = a.timestamp || 0;
    const bTime = b.timestamp || 0;
    return aTime - bTime;
  });

  // Build messageIds Set for deduplication tracking
  const messageIds = new Set<string>(sortedMessages.map((msg) => msg.id));

  return {
    messages: sortedMessages,
    messageIds,
  };
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
 * Each session has its own data, messages, loading state, and metadata
 */
export interface SessionData {
  id: string;
  projectId: string;
  userId: string;
  name?: string;
  agent: AgentType;
  type: SessionType;
  permission_mode: 'default' | 'plan' | 'acceptEdits' | 'bypassPermissions';
  state: 'idle' | 'working' | 'error';
  error_message?: string;
  is_archived: boolean;
  archived_at: Date | null;
  created_at: Date;
  updated_at: Date;

  // Client-side state
  messages: UIMessage[];
  isStreaming: boolean;
  metadata: AgentSessionMetadata | null;
  loadingState: LoadingState;
  error: string | null;
  messageIds: Set<string>; // Deduplication tracking
  streamingMessageId: string | null; // Track which message is streaming
}

/**
 * Session list data for a project
 */
export interface SessionListData {
  sessions: SessionSummary[];
  loading: boolean;
  error: string | null;
  lastFetched: number;
}

/**
 * Summary of a session for list views
 * Subset of SessionResponse with fields needed for rendering lists and dropdowns
 */
export interface SessionSummary {
  id: string;
  projectId: string;
  userId: string;
  name?: string;
  agent: AgentType;
  type: SessionType;
  state: 'idle' | 'working' | 'error';
  permission_mode: 'default' | 'plan' | 'acceptEdits' | 'bypassPermissions';
  error_message?: string;
  session_path?: string;
  is_archived: boolean;
  archived_at: Date | null;
  metadata: AgentSessionMetadata;
  created_at: Date;
  updated_at: Date;
}

/**
 * SessionStore state and actions
 * Manages single active session with simplified state model
 */
export interface SessionStore {
  // State - single session model
  currentSession: SessionData | null;
  sessionList: SessionListData; // Single list, filtered via selectors
  form: FormState;
  handledPermissions: Set<string>;

  // Session lifecycle actions
  loadSession: (sessionId: string, projectId: string) => Promise<void>;
  loadSessionList: (projectId: string | null, filters?: Record<string, unknown>) => Promise<void>;
  createSession: (projectId: string, data: { agent?: AgentType; permission_mode?: string; sessionId: string }) => Promise<SessionResponse>;
  updateSession: (sessionId: string, updates: Partial<SessionData>) => Promise<void>;
  archiveSession: (sessionId: string) => Promise<void>;
  unarchiveSession: (sessionId: string) => Promise<void>;
  clearSession: (sessionId: string) => void;
  clearAllSessions: () => void;

  // WebSocket payload actions (Phase 0 integration)
  setSession: (sessionId: string, session: SessionResponse) => void;
  updateSessionInList: (projectId: string, session: SessionResponse) => void;

  // Message actions (work on specific session by ID)
  addMessage: (sessionId: string, message: UIMessage) => void;
  updateStreamingMessage: (sessionId: string, messageId: string, contentBlocks: UnifiedContent[]) => void;
  finalizeMessage: (sessionId: string, messageId: string) => void;

  // State actions
  setStreaming: (sessionId: string, isStreaming: boolean) => void;
  updateMetadata: (sessionId: string, metadata: Partial<AgentSessionMetadata>) => void;
  setError: (sessionId: string, error: string | null) => void;
  setLoadingState: (sessionId: string, state: LoadingState) => void;

  // Permission mode actions
  setPermissionMode: (mode: PermissionMode) => void;
  getPermissionMode: () => PermissionMode;

  // Agent selection actions
  setAgent: (agent: AgentType) => void;
  getAgent: () => AgentType;

  // Model selection actions
  setModel: (model: string) => void;
  getModel: () => string;

  // Permission approval actions
  markPermissionHandled: (toolUseId: string) => void;
  clearHandledPermissions: () => void;
  clearToolResultError: (sessionId: string, toolUseId: string) => void;

  // Initialize defaults from user settings
  initializeFromSettings: (settings: { permissionMode?: PermissionMode; agent?: AgentType }) => void;
}

/**
 * Session store
 * Manages single active session with simplified state model
 */
export const useSessionStore = create<SessionStore>((set, get) => ({
  // Initial state
  currentSession: null,
  sessionList: {
    sessions: [],
    loading: false,
    error: null,
    lastFetched: 0,
  },
  form: {
    permissionMode: "acceptEdits",
    agent: "claude",
    model: "",
  },
  handledPermissions: new Set<string>(),

  // ============================================================================
  // PUBLIC API - Session Lifecycle
  // ============================================================================

  /**
   * Load session from API with optimistic message merge
   * Fetches session metadata + messages, merges with in-memory optimistic/streaming messages
   *
   * **Merge Logic:**
   * - Always loads messages from server (no early returns)
   * - Merges server messages with in-memory optimistic user messages (content-based matching)
   * - Preserves streaming assistant messages during merge
   * - Handles 404 gracefully (new sessions without JSONL file yet)
   * - Fails silently on errors (no throws, no toasts)
   */
  loadSession: async (sessionId: string, projectId: string) => {
    // Check if already loading to prevent duplicate requests
    const state = get();
    if (state.currentSession?.id === sessionId && state.currentSession?.loadingState === 'loading') {
      return;
    }

    // Capture in-memory messages before loading (for merge)
    const inMemoryMessages = state.currentSession?.id === sessionId
      ? state.currentSession.messages
      : [];
    const isStreaming = state.currentSession?.id === sessionId
      ? state.currentSession.isStreaming
      : false;
    const streamingMessageId = state.currentSession?.id === sessionId
      ? state.currentSession.streamingMessageId
      : null;

    // Set loading state
    const session = state.currentSession?.id === sessionId
      ? state.currentSession
      : createEmptySession(sessionId, projectId);
    set({
      currentSession: {
        ...session,
        loadingState: 'loading',
      }
    });

    try {
      // Fetch session metadata from API using centralized api client
      const data = await api.get<{ data: SessionResponse }>(
        `/api/projects/${projectId}/sessions/${sessionId}`
      );
      const sessionResponse: SessionResponse = data.data;

      // Convert to SessionData and store
      get().setSession(sessionId, sessionResponse);

      // Fetch messages from API - always load (no early returns)
      let serverMessages: UIMessage[] = [];
      try {
        const messagesData = await api.get<{ data: UnifiedMessage[] }>(
          `/api/projects/${projectId}/sessions/${sessionId}/messages`
        );
        const rawMessages = messagesData.data || [];

        // Enrich messages with tool results
        serverMessages = enrichMessagesWithToolResults(rawMessages);
      } catch {
        // 404 is expected for new sessions (no JSONL file yet)
        // Use empty array for server messages, merge will preserve optimistic
        if (import.meta.env.DEV) {
          console.log(`[SessionStore] No messages file for session ${sessionId} (expected for new sessions)`);
        }
      }

      // Merge in-memory messages with server messages
      const { messages: mergedMessages, messageIds } = mergeMessages(
        inMemoryMessages,
        serverMessages
      );

      // Update session with merged messages
      set((state) => {
        if (state.currentSession?.id !== sessionId) return state;
        return {
          currentSession: {
            ...(state.currentSession || createEmptySession(sessionId, projectId)),
            messages: mergedMessages,
            messageIds,
            isStreaming, // Preserve streaming state
            streamingMessageId, // Preserve streaming message ID
            loadingState: 'loaded',
          }
        };
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load session';

      set((state) => {
        if (state.currentSession?.id !== sessionId) return state;
        return {
          currentSession: {
            ...(state.currentSession || createEmptySession(sessionId, projectId)),
            loadingState: 'error',
            error: errorMessage,
          }
        };
      });
    }
  },

  /**
   * Load session list from API
   * Uses project-specific endpoint when projectId provided (limit=20)
   * Uses global endpoint otherwise (limit=50)
   */
  loadSessionList: async (projectId: string | null, filters?: Record<string, unknown>) => {
    // Set loading state
    set((state) => ({
      sessionList: {
        ...state.sessionList,
        loading: true,
        error: null,
      }
    }));

    try {
      // Build query params
      const params = new URLSearchParams();
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          params.append(key, String(value));
        });
      }

      // Use project-specific endpoint with limit=20 when projectId provided
      // Use global endpoint with limit=50 otherwise
      const url = projectId
        ? `/api/projects/${projectId}/sessions?${params}&limit=20`
        : `/api/sessions?${params}&limit=50`;

      const data = await api.get<{ data: SessionSummary[] }>(url);
      const sessions: SessionSummary[] = data.data;

      set({
        sessionList: {
          sessions,
          loading: false,
          error: null,
          lastFetched: Date.now(),
        }
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load session list';

      set((state) => ({
        sessionList: {
          ...state.sessionList,
          loading: false,
          error: errorMessage,
          lastFetched: Date.now(),
        }
      }));
    }
  },

  /**
   * Create new session
   * POST to API and add to Map optimistically
   */
  createSession: async (projectId: string, data: { agent?: AgentType; permission_mode?: string; sessionId: string }) => {
    try {
      const result = await api.post<{ data: SessionResponse }>(
        `/api/projects/${projectId}/sessions`,
        data
      );
      const session: SessionResponse = result.data;

      // Add to sessions Map
      get().setSession(session.id, session);

      // Add to sessionLists Map
      get().updateSessionInList(projectId, session);

      return session;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create session';
      throw new Error(errorMessage);
    }
  },

  /**
   * Update session
   * PATCH to API and update Map
   */
  updateSession: async (sessionId: string, updates: Partial<SessionData>) => {
    try {
      const result = await api.patch<{ data: SessionResponse }>(
        `/api/sessions/${sessionId}`,
        updates
      );
      const session: SessionResponse = result.data;

      // Update sessions Map
      get().setSession(sessionId, session);

      // Note: Session list update handled by WebSocket SESSION_UPDATED event
      // to avoid duplicate updates and list jitter
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update session';
      throw new Error(errorMessage);
    }
  },

  /**
   * Archive session
   * POST to archive endpoint and update current session
   */
  archiveSession: async (sessionId: string) => {
    try {
      await api.post(`/api/sessions/${sessionId}/archive`);

      // Update current session
      const state = get();
      if (state.currentSession?.id === sessionId) {
        set({
          currentSession: {
            ...state.currentSession,
            is_archived: true,
            archived_at: new Date(),
          }
        });
      }

      // Remove from single session list
      set((state) => ({
        sessionList: {
          ...state.sessionList,
          sessions: state.sessionList.sessions.filter(s => s.id !== sessionId),
        }
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to archive session';
      throw new Error(errorMessage);
    }
  },

  /**
   * Unarchive session
   * POST to unarchive endpoint and update Map
   */
  unarchiveSession: async (sessionId: string) => {
    try {
      const result = await api.post<{ data: SessionResponse }>(
        `/api/sessions/${sessionId}/unarchive`
      );
      const session: SessionResponse = result.data;

      // Update currentSession if it matches
      get().setSession(sessionId, session);

      // Add back to single session list
      get().updateSessionInList(session.projectId, session);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to unarchive session';
      throw new Error(errorMessage);
    }
  },

  /**
   * Clear specific session
   */
  clearSession: (sessionId: string) => {
    set((state) => {
      if (state.currentSession?.id !== sessionId) return state;
      return {
        currentSession: null,
      };
    });
  },

  /**
   * Clear all sessions
   */
  clearAllSessions: () => {
    set({
      currentSession: null,
      sessionList: {
        sessions: [],
        loading: false,
        error: null,
        lastFetched: 0,
      },
    });
  },

  // ============================================================================
  // PUBLIC API - WebSocket Payload Actions (Phase 0 Integration)
  // ============================================================================

  /**
   * Set full session from WebSocket payload
   * Used by SESSION_UPDATED and MESSAGE_COMPLETE handlers
   */
  setSession: (sessionId: string, session: SessionResponse) => {
    set((state) => {
      // Only update if this is the current session (or initializing when currentSession is null)
      // Guards against WebSocket race conditions during session navigation
      if (state.currentSession !== null && state.currentSession.id !== sessionId) {
        return state;
      }

      const existing = state.currentSession;
      const messages = existing?.messages || [];
      const messageIds = existing?.messageIds || new Set<string>();

      const sessionData: SessionData = {
        ...session,
        // Preserve client-side state
        messages,
        isStreaming: existing?.isStreaming || false,
        metadata: session.metadata,
        loadingState: existing?.loadingState === 'loading' ? 'loading' : 'loaded',
        error: null,
        messageIds,
        streamingMessageId: existing?.streamingMessageId || null,
      };

      return {
        currentSession: sessionData,
        // Sync session permission_mode to form state so ChatInput displays correct value
        form: {
          ...state.form,
          permissionMode: session.permission_mode,
        }
      };
    });
  },

  /**
   * Update session in sessionLists Map from WebSocket payload
   * Used to update sidebar without refetch
   * Updates both project-specific list and "__all__" list if they exist
   */
  updateSessionInList: (_projectId: string, session: SessionResponse) => {
    set((state) => {
      const summary: SessionSummary = {
        id: session.id,
        projectId: session.projectId,
        userId: session.userId,
        name: session.name,
        agent: session.agent,
        type: session.type,
        state: session.state,
        permission_mode: session.permission_mode,
        error_message: session.error_message,
        session_path: session.session_path,
        is_archived: session.is_archived,
        archived_at: session.archived_at,
        metadata: session.metadata,
        created_at: session.created_at,
        updated_at: session.updated_at,
      };

      // Find and update session in single list
      const existingIndex = state.sessionList.sessions.findIndex(s => s.id === session.id);
      const updatedSessions = existingIndex !== -1
        ? state.sessionList.sessions.map((s, i) => i === existingIndex ? summary : s)
        : [summary, ...state.sessionList.sessions];

      return {
        sessionList: {
          ...state.sessionList,
          sessions: updatedSessions,
        }
      };
    });
  },

  // ============================================================================
  // PUBLIC API - Message Actions
  // ============================================================================

  /**
   * Add message to specific session
   */
  addMessage: (sessionId: string, message: UIMessage) => {
    set((state) => {
      // Only add to current session (or allow if initializing when currentSession is null)
      // Guards against adding messages to wrong session during navigation
      if (state.currentSession !== null && state.currentSession.id !== sessionId) {
        return state;
      }

      // Safety check - should not happen after setSession
      if (!state.currentSession) {
        console.error('[addMessage] ERROR - currentSession is null, cannot add message');
        return state;
      }

      // Check for duplicate message
      if (state.currentSession.messageIds.has(message.id)) {
        return state; // Skip duplicate
      }

      // Add message ID to set
      const newMessageIds = new Set(state.currentSession.messageIds);
      newMessageIds.add(message.id);

      return {
        currentSession: {
          ...state.currentSession,
          messages: [...state.currentSession.messages, message],
          messageIds: newMessageIds,
        }
      };
    });
  },

  /**
   * Update streaming message content
   * Searches entire messages array by ID (not just last message)
   */
  updateStreamingMessage: (sessionId: string, messageId: string, contentBlocks: UnifiedContent[]) => {
    set((state) => {
      if (state.currentSession?.id !== sessionId) return state;

      const messages = state.currentSession.messages;

      // Find message by ID anywhere in array (not just last)
      const messageIndex = messages.findIndex(m => m.id === messageId);
      const foundMessage = messageIndex !== -1 ? messages[messageIndex] : null;

      let updatedMessages: UIMessage[];
      let newMessageIds = state.currentSession.messageIds;

      if (foundMessage && foundMessage.role === 'assistant' && foundMessage.isStreaming) {
        // Update existing streaming message
        const _original = import.meta.env.DEV
          ? (foundMessage._original || { ...foundMessage })
          : undefined;

        updatedMessages = messages.map((msg, i) =>
          i === messageIndex
            ? { ...msg, content: contentBlocks, _original }
            : msg
        );
      } else {
        // Create new streaming message
        const newMessage: UIMessage = {
          id: messageId,
          role: "assistant" as const,
          content: contentBlocks,
          timestamp: Date.now(),
          tool: 'claude' as const,
          isStreaming: true,
          _original: import.meta.env.DEV ? { id: messageId, role: 'assistant', content: contentBlocks, timestamp: Date.now() } : undefined,
          parentId: undefined,
          sessionId: undefined,
        };

        updatedMessages = [...messages, newMessage];

        // Add to messageIds set
        newMessageIds = new Set(state.currentSession.messageIds);
        newMessageIds.add(messageId);
      }

      return {
        currentSession: {
          ...state.currentSession,
          messages: updatedMessages,
          isStreaming: true,
          streamingMessageId: messageId,
          messageIds: newMessageIds,
        }
      };
    });
  },

  /**
   * Finalize streaming message
   */
  finalizeMessage: (sessionId: string, messageId: string) => {
    set((state) => {
      if (state.currentSession?.id !== sessionId) return state;

      // Mark messages as no longer streaming
      const messages = state.currentSession.messages.map((msg) =>
        msg.id === messageId || msg.isStreaming
          ? { ...msg, isStreaming: false }
          : msg
      );

      // Apply enrichment to nest tool results
      const enrichedMessages = enrichMessagesWithToolResults(messages);

      return {
        currentSession: {
          ...state.currentSession,
          messages: enrichedMessages,
          isStreaming: false,
          streamingMessageId: null,
        }
      };
    });
  },

  // ============================================================================
  // PUBLIC API - State Actions
  // ============================================================================

  setStreaming: (sessionId: string, isStreaming: boolean) => {
    set((state) => {
      if (state.currentSession?.id !== sessionId) return state;

      return {
        currentSession: {
          ...state.currentSession,
          isStreaming,
        }
      };
    });
  },

  updateMetadata: (sessionId: string, metadata: Partial<AgentSessionMetadata>) => {
    set((state) => {
      if (state.currentSession?.id !== sessionId) return state;

      return {
        currentSession: {
          ...state.currentSession,
          metadata: {
            ...(state.currentSession.metadata || {
              totalTokens: 0,
              messageCount: 0,
              lastMessageAt: "",
              firstMessagePreview: "",
            }),
            ...metadata,
          },
        }
      };
    });
  },

  setError: (sessionId: string, error: string | null) => {
    set((state) => {
      if (state.currentSession?.id !== sessionId) return state;

      return {
        currentSession: {
          ...state.currentSession,
          error,
        }
      };
    });
  },

  setLoadingState: (sessionId: string, loadingState: LoadingState) => {
    set((state) => {
      if (state.currentSession?.id !== sessionId) return state;

      return {
        currentSession: {
          ...state.currentSession,
          loadingState,
        }
      };
    });
  },

  // ============================================================================
  // PUBLIC API - Form Actions
  // ============================================================================

  setPermissionMode: (mode: PermissionMode) => {
    set((state) => ({
      form: {
        ...state.form,
        permissionMode: mode,
      },
    }));
  },

  getPermissionMode: () => {
    const state = get();
    return state.form.permissionMode || "acceptEdits";
  },

  setAgent: (agent: AgentType) => {
    set((state) => ({
      form: {
        ...state.form,
        agent,
      },
    }));
  },

  getAgent: () => {
    const state = get();
    return state.form.agent;
  },

  setModel: (model: string) => {
    set((state) => ({
      form: {
        ...state.form,
        model,
      },
    }));
  },

  getModel: () => {
    const state = get();
    return state.form.model;
  },

  // ============================================================================
  // PUBLIC API - Permission Actions
  // ============================================================================

  markPermissionHandled: (toolUseId: string) => {
    set((state) => {
      const newSet = new Set(state.handledPermissions);
      newSet.add(toolUseId);
      return { handledPermissions: newSet };
    });
  },

  clearHandledPermissions: () => {
    set({ handledPermissions: new Set<string>() });
  },

  clearToolResultError: (sessionId: string, toolUseId: string) => {
    set((state) => {
      if (state.currentSession?.id !== sessionId) return state;

      return {
        currentSession: {
          ...state.currentSession,
          messages: state.currentSession.messages.map((msg: UIMessage) => ({
            ...msg,
            content: Array.isArray(msg.content)
              ? msg.content.map((block: UnifiedContent) => {
                  if (block.type === 'tool_use' && block.id === toolUseId && 'result' in block && block.result) {
                    return { ...block, result: { ...(block.result as { is_error?: boolean }), is_error: false } };
                  }
                  return block;
                })
              : msg.content
          })),
        }
      };
    });
  },

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

// ============================================================================
// PRIVATE HELPERS
// ============================================================================

/**
 * Create empty session data structure
 */
function createEmptySession(sessionId: string, projectId: string): SessionData {
  return {
    id: sessionId,
    projectId,
    userId: '', // Will be filled when loaded
    agent: 'claude',
    type: 'chat',
    permission_mode: 'acceptEdits',
    state: 'idle',
    is_archived: false,
    archived_at: null,
    created_at: new Date(),
    updated_at: new Date(),
    messages: [],
    isStreaming: false,
    metadata: null,
    loadingState: 'idle',
    error: null,
    messageIds: new Set(),
    streamingMessageId: null,
  };
}

/**
 * Selector to calculate context window token usage from last assistant message
 * Matches CLI behavior - shows current context window usage, not cumulative total
 */
export const selectTotalTokens = (state: SessionStore): number => {
  if (!state.currentSession?.messages) return 0;

  // Find last assistant message with usage data
  const messages = state.currentSession.messages;
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    if (message.role === "assistant" && message.usage) {
      const usage = message.usage;
      return (
        (usage.inputTokens || 0) +
        (usage.outputTokens || 0) +
        (usage.cacheCreationTokens || 0) +
        (usage.cacheReadTokens || 0)
      );
    }
  }

  return 0;
};

/**
 * Selector to get all sessions
 */
export const selectAllSessions = (state: SessionStore): SessionSummary[] => {
  return state.sessionList.sessions;
};

/**
 * Selector to get sessions filtered by project ID
 */
export const selectProjectSessions = (projectId: string) => (state: SessionStore): SessionSummary[] => {
  return state.sessionList.sessions.filter(s => s.projectId === projectId);
};

/**
 * Selector to get session list by project ID
 * Pass null to get all sessions across projects
 * Returns SessionListData structure for backward compatibility
 */
export const selectSessionList = (projectId: string | null) => (state: SessionStore): SessionListData => {
  const sessions = projectId
    ? state.sessionList.sessions.filter(s => s.projectId === projectId)
    : state.sessionList.sessions;

  return {
    sessions,
    loading: state.sessionList.loading,
    error: state.sessionList.error,
    lastFetched: state.sessionList.lastFetched,
  };
};

/**
 * Selector to get current session
 */
export const selectActiveSession = (state: SessionStore): SessionData | null => {
  return state.currentSession;
};
