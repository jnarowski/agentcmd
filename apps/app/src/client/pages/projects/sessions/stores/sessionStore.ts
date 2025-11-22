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
 * Session data structure for Map-based storage
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
  lastAccessedAt: number; // LRU cache timestamp
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
 * SessionStore state and actions - Map-based architecture
 * Supports multiple concurrent sessions with Map-based storage
 */
export interface SessionStore {
  // State - Map-based architecture
  sessions: Map<string, SessionData>; // sessionId → SessionData
  sessionLists: Map<string, SessionListData>; // projectId → SessionListData
  activeSessionId: string | null;
  form: FormState;
  handledPermissions: Set<string>;

  // Session lifecycle actions
  loadSession: (sessionId: string, projectId: string) => Promise<void>;
  loadSessionList: (projectId: string, filters?: Record<string, unknown>) => Promise<void>;
  createSession: (projectId: string, data: { agent?: AgentType; permission_mode?: string; sessionId: string }) => Promise<SessionResponse>;
  updateSession: (sessionId: string, updates: Partial<SessionData>) => Promise<void>;
  archiveSession: (sessionId: string) => Promise<void>;
  unarchiveSession: (sessionId: string) => Promise<void>;
  clearSession: (sessionId: string) => void;
  clearAllSessions: () => void;
  setActiveSession: (sessionId: string | null) => void;

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

const MAX_SESSIONS_IN_CACHE = 5;

/**
 * Session store - Map-based architecture
 * Manages multiple concurrent sessions with LRU cache
 */
export const useSessionStore = create<SessionStore>((set, get) => ({
  // Initial state - Map-based
  sessions: new Map<string, SessionData>(),
  sessionLists: new Map<string, SessionListData>(),
  activeSessionId: null,
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
   * Load session from API
   * Fetches session metadata + messages and stores in Map
   */
  loadSession: async (sessionId: string, projectId: string) => {
    // Check if already loading to prevent duplicate requests
    const state = get();
    const existing = state.sessions.get(sessionId);
    if (existing?.loadingState === 'loading') {
      return;
    }

    // Set loading state
    const currentSession = state.sessions.get(sessionId) || createEmptySession(sessionId, projectId);
    set({
      sessions: new Map(state.sessions).set(sessionId, {
        ...currentSession,
        loadingState: 'loading',
        lastAccessedAt: Date.now(),
      })
    });

    try {
      // Fetch session metadata from API using centralized api client
      const data = await api.get<{ data: SessionResponse }>(
        `/api/projects/${projectId}/sessions/${sessionId}`
      );
      const session: SessionResponse = data.data;

      // Convert to SessionData and store
      get().setSession(sessionId, session);

      // Fetch messages from API
      try {
        const messagesData = await api.get<{ data: UnifiedMessage[] }>(
          `/api/projects/${projectId}/sessions/${sessionId}/messages`
        );
        const rawMessages = messagesData.data || [];

        // Enrich messages with tool results
        const enrichedMessages = enrichMessagesWithToolResults(rawMessages);

        // Update session with messages
        set((state) => ({
          sessions: new Map(state.sessions).set(sessionId, {
            ...(state.sessions.get(sessionId) || createEmptySession(sessionId, projectId)),
            messages: enrichedMessages,
            loadingState: 'loaded',
            lastAccessedAt: Date.now(),
          })
        }));
      } catch (messageError) {
        // If messages fail to load (e.g., 404 for new session), just continue with empty messages
        console.warn(`[SessionStore] Failed to load messages for session ${sessionId}:`, messageError);
      }

      // Enforce LRU cache limit
      evictOldestSessions(get, set);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load session';

      set((state) => ({
        sessions: new Map(state.sessions).set(sessionId, {
          ...(state.sessions.get(sessionId) || createEmptySession(sessionId, projectId)),
          loadingState: 'error',
          error: errorMessage,
          lastAccessedAt: Date.now(),
        })
      }));
    }
  },

  /**
   * Load session list from API
   * Fetches list of sessions for a project and stores in Map
   * Pass null for projectId to fetch all sessions across projects
   */
  loadSessionList: async (projectId: string | null, filters?: Record<string, unknown>) => {
    const state = get();

    // Use special key for "all sessions" when projectId is null
    const cacheKey = projectId || '__all__';

    // Set loading state
    const currentList = state.sessionLists.get(cacheKey);
    set({
      sessionLists: new Map(state.sessionLists).set(cacheKey, {
        sessions: currentList?.sessions || [],
        loading: true,
        error: null,
        lastFetched: Date.now(),
      })
    });

    try {
      // Build query params
      const params = new URLSearchParams();
      if (projectId) {
        params.append('projectId', projectId);
      }
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          params.append(key, String(value));
        });
      }

      // Fetch sessions from API using centralized api client
      // Use global /api/sessions endpoint (supports projectId query param)
      const data = await api.get<{ data: SessionSummary[] }>(
        `/api/sessions?${params}`
      );
      const sessions: SessionSummary[] = data.data;

      set((state) => ({
        sessionLists: new Map(state.sessionLists).set(cacheKey, {
          sessions,
          loading: false,
          error: null,
          lastFetched: Date.now(),
        })
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load session list';

      set((state) => ({
        sessionLists: new Map(state.sessionLists).set(cacheKey, {
          sessions: state.sessionLists.get(cacheKey)?.sessions || [],
          loading: false,
          error: errorMessage,
          lastFetched: Date.now(),
        })
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

      // Update sessionLists Map (find project and update)
      const state = get();
      for (const [projectId, listData] of state.sessionLists) {
        const sessionIndex = listData.sessions.findIndex(s => s.id === sessionId);
        if (sessionIndex !== -1) {
          get().updateSessionInList(projectId, session);
          break;
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update session';
      throw new Error(errorMessage);
    }
  },

  /**
   * Archive session
   * POST to archive endpoint and update Map
   */
  archiveSession: async (sessionId: string) => {
    try {
      await api.post(`/api/sessions/${sessionId}/archive`);

      // Update sessions Map
      const state = get();
      const session = state.sessions.get(sessionId);
      if (session) {
        set({
          sessions: new Map(state.sessions).set(sessionId, {
            ...session,
            is_archived: true,
            archived_at: new Date(),
            lastAccessedAt: Date.now(),
          })
        });
      }

      // Remove from all sessionLists (project-specific and "__all__")
      const newSessionLists = new Map(state.sessionLists);
      for (const [cacheKey, listData] of newSessionLists) {
        const filtered = listData.sessions.filter(s => s.id !== sessionId);
        if (filtered.length !== listData.sessions.length) {
          newSessionLists.set(cacheKey, {
            ...listData,
            sessions: filtered,
          });
        }
      }
      set({ sessionLists: newSessionLists });
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

      // Update sessions Map
      get().setSession(sessionId, session);

      // Add back to sessionLists Map
      const state = get();
      const projectId = session.projectId;
      const listData = state.sessionLists.get(projectId);
      if (listData) {
        get().updateSessionInList(projectId, session);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to unarchive session';
      throw new Error(errorMessage);
    }
  },

  /**
   * Clear specific session from Map
   */
  clearSession: (sessionId: string) => {
    set((state) => {
      const newSessions = new Map(state.sessions);
      newSessions.delete(sessionId);
      return {
        sessions: newSessions,
        activeSessionId: state.activeSessionId === sessionId ? null : state.activeSessionId,
      };
    });
  },

  /**
   * Clear all sessions from Map
   */
  clearAllSessions: () => {
    set({
      sessions: new Map(),
      sessionLists: new Map(),
      activeSessionId: null,
    });
  },

  /**
   * Set active session ID
   */
  setActiveSession: (sessionId: string | null) => {
    set({ activeSessionId: sessionId });

    // Update lastAccessedAt for LRU cache
    if (sessionId) {
      const state = get();
      const session = state.sessions.get(sessionId);
      if (session) {
        set({
          sessions: new Map(state.sessions).set(sessionId, {
            ...session,
            lastAccessedAt: Date.now(),
          })
        });
      }
    }
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
      const existing = state.sessions.get(sessionId);
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
        lastAccessedAt: Date.now(),
      };

      return {
        sessions: new Map(state.sessions).set(sessionId, sessionData)
      };
    });
  },

  /**
   * Update session in sessionLists Map from WebSocket payload
   * Used to update sidebar without refetch
   * Updates both project-specific list and "__all__" list if they exist
   */
  updateSessionInList: (projectId: string, session: SessionResponse) => {
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

      const newSessionLists = new Map(state.sessionLists);

      // Helper to update or add session to a list
      const updateList = (cacheKey: string) => {
        const listData = newSessionLists.get(cacheKey);
        if (!listData) return;

        const existingIndex = listData.sessions.findIndex(s => s.id === session.id);
        const updatedSessions = existingIndex !== -1
          ? listData.sessions.map((s, i) => i === existingIndex ? summary : s)
          : [...listData.sessions, summary];

        newSessionLists.set(cacheKey, {
          ...listData,
          sessions: updatedSessions,
        });
      };

      // Update project-specific list
      updateList(projectId);

      // Also update "__all__" list if it exists
      updateList('__all__');

      return { sessionLists: newSessionLists };
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
      const session = state.sessions.get(sessionId);
      if (!session) return state;

      // Check for duplicate message
      if (session.messageIds.has(message.id)) {
        return state; // Skip duplicate
      }

      // Add message ID to set
      const newMessageIds = new Set(session.messageIds);
      newMessageIds.add(message.id);

      return {
        sessions: new Map(state.sessions).set(sessionId, {
          ...session,
          messages: [...session.messages, message],
          messageIds: newMessageIds,
          lastAccessedAt: Date.now(),
        })
      };
    });
  },

  /**
   * Update streaming message content
   * Searches entire messages array by ID (not just last message)
   */
  updateStreamingMessage: (sessionId: string, messageId: string, contentBlocks: UnifiedContent[]) => {
    set((state) => {
      const session = state.sessions.get(sessionId);
      if (!session) return state;

      const messages = session.messages;

      // Find message by ID anywhere in array (not just last)
      const messageIndex = messages.findIndex(m => m.id === messageId);
      const foundMessage = messageIndex !== -1 ? messages[messageIndex] : null;

      let updatedMessages: UIMessage[];

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
        const newMessageIds = new Set(session.messageIds);
        newMessageIds.add(messageId);

        return {
          sessions: new Map(state.sessions).set(sessionId, {
            ...session,
            messages: updatedMessages,
            isStreaming: true,
            streamingMessageId: messageId,
            messageIds: newMessageIds,
            lastAccessedAt: Date.now(),
          })
        };
      }

      return {
        sessions: new Map(state.sessions).set(sessionId, {
          ...session,
          messages: updatedMessages,
          isStreaming: true,
          streamingMessageId: messageId,
          lastAccessedAt: Date.now(),
        })
      };
    });
  },

  /**
   * Finalize streaming message
   */
  finalizeMessage: (sessionId: string, messageId: string) => {
    set((state) => {
      const session = state.sessions.get(sessionId);
      if (!session) return state;

      // Mark messages as no longer streaming
      const messages = session.messages.map((msg) =>
        msg.id === messageId || msg.isStreaming
          ? { ...msg, isStreaming: false }
          : msg
      );

      // Apply enrichment to nest tool results
      const enrichedMessages = enrichMessagesWithToolResults(messages);

      return {
        sessions: new Map(state.sessions).set(sessionId, {
          ...session,
          messages: enrichedMessages,
          isStreaming: false,
          streamingMessageId: null,
          lastAccessedAt: Date.now(),
        })
      };
    });
  },

  // ============================================================================
  // PUBLIC API - State Actions
  // ============================================================================

  setStreaming: (sessionId: string, isStreaming: boolean) => {
    set((state) => {
      const session = state.sessions.get(sessionId);
      if (!session) return state;

      return {
        sessions: new Map(state.sessions).set(sessionId, {
          ...session,
          isStreaming,
          lastAccessedAt: Date.now(),
        })
      };
    });
  },

  updateMetadata: (sessionId: string, metadata: Partial<AgentSessionMetadata>) => {
    set((state) => {
      const session = state.sessions.get(sessionId);
      if (!session) return state;

      return {
        sessions: new Map(state.sessions).set(sessionId, {
          ...session,
          metadata: {
            ...(session.metadata || {
              totalTokens: 0,
              messageCount: 0,
              lastMessageAt: "",
              firstMessagePreview: "",
            }),
            ...metadata,
          },
          lastAccessedAt: Date.now(),
        })
      };
    });
  },

  setError: (sessionId: string, error: string | null) => {
    set((state) => {
      const session = state.sessions.get(sessionId);
      if (!session) return state;

      return {
        sessions: new Map(state.sessions).set(sessionId, {
          ...session,
          error,
          lastAccessedAt: Date.now(),
        })
      };
    });
  },

  setLoadingState: (sessionId: string, loadingState: LoadingState) => {
    set((state) => {
      const session = state.sessions.get(sessionId);
      if (!session) return state;

      return {
        sessions: new Map(state.sessions).set(sessionId, {
          ...session,
          loadingState,
          lastAccessedAt: Date.now(),
        })
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
      const session = state.sessions.get(sessionId);
      if (!session) return state;

      return {
        sessions: new Map(state.sessions).set(sessionId, {
          ...session,
          messages: session.messages.map((msg: UIMessage) => ({
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
          lastAccessedAt: Date.now(),
        })
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
    lastAccessedAt: Date.now(),
  };
}

/**
 * Evict oldest sessions from Map when limit exceeded (LRU cache)
 */
function evictOldestSessions(
  get: () => SessionStore,
  set: (partial: Partial<SessionStore> | ((state: SessionStore) => Partial<SessionStore>)) => void
) {
  const state = get();

  if (state.sessions.size <= MAX_SESSIONS_IN_CACHE) {
    return; // Under limit
  }

  // Sort sessions by lastAccessedAt
  const sorted = Array.from(state.sessions.entries())
    .sort((a, b) => a[1].lastAccessedAt - b[1].lastAccessedAt);

  // Keep most recent MAX_SESSIONS_IN_CACHE sessions
  const toKeep = sorted.slice(-MAX_SESSIONS_IN_CACHE);

  set({
    sessions: new Map(toKeep),
  });
}

/**
 * Memoized selector to calculate total tokens from all assistant messages in a session
 */
export const selectTotalTokens = (sessionId: string) => (state: SessionStore): number => {
  const session = state.sessions.get(sessionId);
  if (!session?.messages) return 0;

  return session.messages.reduce((total, message) => {
    if (message.role !== "assistant" || !message.usage) {
      return total;
    }

    const usage = message.usage;
    return (
      total +
      (usage.inputTokens || 0) +
      (usage.outputTokens || 0)
    );
  }, 0);
};

/**
 * Selector to get session by ID
 */
export const selectSession = (sessionId: string) => (state: SessionStore): SessionData | undefined => {
  return state.sessions.get(sessionId);
};

/**
 * Selector to get session list by project ID
 * Pass null to get all sessions across projects
 */
export const selectSessionList = (projectId: string | null) => (state: SessionStore): SessionListData | undefined => {
  const cacheKey = projectId || '__all__';
  return state.sessionLists.get(cacheKey);
};

/**
 * Selector to get active session
 */
export const selectActiveSession = (state: SessionStore): SessionData | undefined => {
  if (!state.activeSessionId) return undefined;
  return state.sessions.get(state.activeSessionId);
};
