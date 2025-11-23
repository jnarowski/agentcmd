import { describe, it, expect, beforeEach, vi } from "vitest";
import { useSessionStore, selectTotalTokens, mergeMessages, enrichMessagesWithToolResults } from "./sessionStore";
import type { UIMessage } from '@/shared/types/message.types';

// Mock the agents module
vi.mock("@/client/utils/agents");

// Mock api client
vi.mock("@/client/utils/api", () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  }
}));

// Mock fetch globally
global.fetch = vi.fn();

describe("SessionStore", () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    useSessionStore.setState({
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
    });

    // Reset all mocks
    vi.clearAllMocks();
  });

  describe("mergeMessages (Critical Optimistic Message Handling)", () => {
    it("should match optimistic user message to server message by exact content", () => {
      const inMemory: UIMessage[] = [{
        id: 'uuid-client-123',
        role: 'user',
        content: [{ type: 'text', text: 'hello world' }],
        timestamp: 1000,
        tool: 'claude',
        isStreaming: false,
        _optimistic: true, // Optimistic client message
      }];

      const server: UIMessage[] = [{
        id: 'msg_abc_server',
        role: 'user',
        content: [{ type: 'text', text: 'hello world' }],
        timestamp: 1001,
        tool: 'claude',
        isStreaming: false,
      }];

      const result = mergeMessages(inMemory, server);

      // Should replace optimistic with server version
      expect(result.messages).toHaveLength(1);
      expect(result.messages[0].id).toBe('msg_abc_server'); // Server ID wins
      expect(result.messages[0]._optimistic).toBeUndefined(); // Not optimistic anymore
      expect(result.messageIds.has('msg_abc_server')).toBe(true);
      expect(result.messageIds.has('uuid-client-123')).toBe(false);
    });

    it("should keep orphaned optimistic messages (CLI hasn't written to disk yet)", () => {
      const inMemory: UIMessage[] = [{
        id: 'uuid-123',
        role: 'user',
        content: [{ type: 'text', text: 'hello' }],
        timestamp: 1000,
        tool: 'claude',
        isStreaming: false,
        _optimistic: true,
      }];

      const server: UIMessage[] = []; // Empty server - CLI hasn't written yet

      const result = mergeMessages(inMemory, server);

      // Should keep optimistic message
      expect(result.messages).toHaveLength(1);
      expect(result.messages[0].id).toBe('uuid-123');
      expect(result.messages[0]._optimistic).toBe(true);
      expect(result.messageIds.has('uuid-123')).toBe(true);
    });

    it("should preserve streaming assistant messages during merge", () => {
      const inMemory: UIMessage[] = [{
        id: 'msg_streaming',
        role: 'assistant',
        content: [{ type: 'text', text: 'Streaming response...' }],
        timestamp: 1000,
        tool: 'claude',
        isStreaming: true, // Still streaming
      }];

      const server: UIMessage[] = []; // Server doesn't have streaming message yet

      const result = mergeMessages(inMemory, server);

      // Should keep streaming message
      expect(result.messages).toHaveLength(1);
      expect(result.messages[0].id).toBe('msg_streaming');
      expect(result.messages[0].isStreaming).toBe(true);
    });

    it("should combine matched optimistic, unmatched server, and streaming messages", () => {
      const inMemory: UIMessage[] = [
        {
          id: 'uuid-1',
          role: 'user',
          content: [{ type: 'text', text: 'first message' }],
          timestamp: 1000,
          tool: 'claude',
          isStreaming: false,
          _optimistic: true,
        },
        {
          id: 'msg_streaming',
          role: 'assistant',
          content: [{ type: 'text', text: 'thinking...' }],
          timestamp: 3000,
          tool: 'claude',
          isStreaming: true,
        },
      ];

      const server: UIMessage[] = [
        {
          id: 'msg_server_1',
          role: 'user',
          content: [{ type: 'text', text: 'first message' }], // Matches optimistic
          timestamp: 1001,
          tool: 'claude',
          isStreaming: false,
        },
        {
          id: 'msg_server_2',
          role: 'assistant',
          content: [{ type: 'text', text: 'response to first' }],
          timestamp: 2000,
          tool: 'claude',
          isStreaming: false,
        },
      ];

      const result = mergeMessages(inMemory, server);

      // Should have: matched optimistic (replaced by server), unmatched server, streaming
      expect(result.messages).toHaveLength(3);

      // Sort by timestamp
      const sorted = result.messages.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

      expect(sorted[0].id).toBe('msg_server_1'); // Matched optimistic → server
      expect(sorted[1].id).toBe('msg_server_2'); // Unmatched server
      expect(sorted[2].id).toBe('msg_streaming'); // Preserved streaming
      expect(sorted[2].isStreaming).toBe(true);
    });

    it("should sort merged messages by timestamp chronologically", () => {
      const inMemory: UIMessage[] = [{
        id: 'uuid-late',
        role: 'user',
        content: [{ type: 'text', text: 'late message' }],
        timestamp: 5000,
        tool: 'claude',
        isStreaming: false,
        _optimistic: true,
      }];

      const server: UIMessage[] = [
        {
          id: 'msg_early',
          role: 'user',
          content: [{ type: 'text', text: 'early message' }],
          timestamp: 1000,
          tool: 'claude',
          isStreaming: false,
        },
        {
          id: 'msg_middle',
          role: 'assistant',
          content: [{ type: 'text', text: 'middle response' }],
          timestamp: 3000,
          tool: 'claude',
          isStreaming: false,
        },
      ];

      const result = mergeMessages(inMemory, server);

      // Should be sorted: early (1000), middle (3000), late (5000)
      expect(result.messages).toHaveLength(3);
      expect(result.messages[0].id).toBe('msg_early');
      expect(result.messages[1].id).toBe('msg_middle');
      expect(result.messages[2].id).toBe('uuid-late');
    });

    it("should only match user messages, not assistant messages", () => {
      const inMemory: UIMessage[] = [{
        id: 'uuid-assistant',
        role: 'assistant',
        content: [{ type: 'text', text: 'response' }],
        timestamp: 1000,
        tool: 'claude',
        isStreaming: false,
        _optimistic: true, // Optimistic assistant (edge case, shouldn't happen)
      }];

      const server: UIMessage[] = [{
        id: 'msg_server',
        role: 'assistant',
        content: [{ type: 'text', text: 'response' }],
        timestamp: 1001,
        tool: 'claude',
        isStreaming: false,
      }];

      const result = mergeMessages(inMemory, server);

      // Optimistic assistant is filtered out (only user messages are optimistic)
      // Only server assistant message remains
      expect(result.messages).toHaveLength(1);
      expect(result.messages[0].id).toBe('msg_server');
    });

    it("should handle complex content with multiple blocks", () => {
      const inMemory: UIMessage[] = [{
        id: 'uuid-complex',
        role: 'user',
        content: [
          { type: 'text', text: 'please run this:' },
          { type: 'tool_use', id: 'tool-1', name: 'Bash', input: { command: 'ls' } },
        ],
        timestamp: 1000,
        tool: 'claude',
        isStreaming: false,
        _optimistic: true,
      }];

      const server: UIMessage[] = [{
        id: 'msg_server',
        role: 'user',
        content: [
          { type: 'text', text: 'please run this:' },
          { type: 'tool_use', id: 'tool-1', name: 'Bash', input: { command: 'ls' } },
        ],
        timestamp: 1001,
        tool: 'claude',
        isStreaming: false,
      }];

      const result = mergeMessages(inMemory, server);

      // Should match by exact content (JSON.stringify)
      expect(result.messages).toHaveLength(1);
      expect(result.messages[0].id).toBe('msg_server');
    });

    it("should build correct messageIds Set for deduplication", () => {
      const inMemory: UIMessage[] = [{
        id: 'uuid-1',
        role: 'user',
        content: [{ type: 'text', text: 'hello' }],
        timestamp: 1000,
        tool: 'claude',
        isStreaming: false,
        _optimistic: true,
      }];

      const server: UIMessage[] = [
        {
          id: 'msg_1',
          role: 'user',
          content: [{ type: 'text', text: 'hello' }],
          timestamp: 1001,
          tool: 'claude',
          isStreaming: false,
        },
        {
          id: 'msg_2',
          role: 'assistant',
          content: [{ type: 'text', text: 'hi!' }],
          timestamp: 2000,
          tool: 'claude',
          isStreaming: false,
        },
      ];

      const result = mergeMessages(inMemory, server);

      // messageIds should contain: msg_1 (matched), msg_2 (unmatched server)
      expect(result.messageIds.size).toBe(2);
      expect(result.messageIds.has('msg_1')).toBe(true);
      expect(result.messageIds.has('msg_2')).toBe(true);
      expect(result.messageIds.has('uuid-1')).toBe(false); // Replaced
    });
  });

  describe("Session Lifecycle", () => {
    it("should clear current session", () => {
      const { clearSession } = useSessionStore.getState();

      // Set up a session first
      useSessionStore.setState({
        currentSession: {
          id: "test-session",
          projectId: "test-project",
          userId: "test-user",
          agent: "claude",
          type: "chat",
          permission_mode: "default",
          state: "idle",
          is_archived: false,
          archived_at: null,
          created_at: new Date(),
          updated_at: new Date(),
          messages: [],
          isStreaming: false,
          metadata: null,
          loadingState: "loaded",
          error: null,
          messageIds: new Set(),
          streamingMessageId: null,
        },
      });

      clearSession("test-session");

      const state = useSessionStore.getState();
      expect(state.currentSession).toBeNull();
    });

    it("should clear all sessions", () => {
      const { clearAllSessions } = useSessionStore.getState();

      // Set up state
      useSessionStore.setState({
        currentSession: {
          id: "test-session",
          projectId: "test-project",
          userId: "test-user",
          agent: "claude",
          type: "chat",
          permission_mode: "default",
          state: "idle",
          is_archived: false,
          archived_at: null,
          created_at: new Date(),
          updated_at: new Date(),
          messages: [],
          isStreaming: false,
          metadata: null,
          loadingState: "loaded",
          error: null,
          messageIds: new Set(),
          streamingMessageId: null,
        },
        sessionList: {
          sessions: [
            {
              id: "session-1",
              projectId: "proj-1",
              userId: "user-1",
              agent: "claude",
              type: "chat",
              state: "idle",
              permission_mode: "default",
              is_archived: false,
              archived_at: null,
              metadata: {
                totalTokens: 0,
                messageCount: 0,
                lastMessageAt: null,
                firstMessagePreview: null,
              },
              created_at: new Date(),
              updated_at: new Date(),
            },
          ],
          loading: false,
          error: null,
          lastFetched: Date.now(),
        },
      });

      clearAllSessions();

      const state = useSessionStore.getState();
      expect(state.currentSession).toBeNull();
      expect(state.sessionList.sessions).toHaveLength(0);
    });
  });

  describe("Message Actions", () => {
    beforeEach(() => {
      // Set up a current session for testing
      useSessionStore.setState({
        currentSession: {
          id: "test-session",
          projectId: "test-project",
          userId: "test-user",
          agent: "claude",
          type: "chat",
          permission_mode: "default",
          state: "idle",
          is_archived: false,
          archived_at: null,
          created_at: new Date(),
          updated_at: new Date(),
          messages: [],
          isStreaming: false,
          metadata: null,
          loadingState: "loaded",
          error: null,
          messageIds: new Set(),
          streamingMessageId: null,
        },
      });
    });

    it("should add message to current session", () => {
      const { addMessage } = useSessionStore.getState();

      addMessage("test-session", {
        id: "msg-1",
        role: "user",
        content: [{ type: "text", text: "Hello" }],
        timestamp: Date.now(),
        tool: 'claude',
        isStreaming: false,
      });

      const state = useSessionStore.getState();
      expect(state.currentSession?.messages).toHaveLength(1);
      expect(state.currentSession?.messages[0].role).toBe("user");
      expect(state.currentSession?.messageIds.has("msg-1")).toBe(true);
    });

    it("should prevent duplicate messages", () => {
      const { addMessage } = useSessionStore.getState();

      const message: UIMessage = {
        id: "msg-1",
        role: "user",
        content: [{ type: "text", text: "Hello" }],
        timestamp: Date.now(),
        tool: 'claude',
        isStreaming: false,
      };

      addMessage("test-session", message);
      addMessage("test-session", message); // Duplicate

      const state = useSessionStore.getState();
      expect(state.currentSession?.messages).toHaveLength(1); // Only one
    });

    it("should update streaming message content", () => {
      const { updateStreamingMessage } = useSessionStore.getState();

      // First chunk
      updateStreamingMessage("test-session", "msg-1", [{ type: "text", text: "Hello" }]);

      let state = useSessionStore.getState();
      expect(state.currentSession?.messages).toHaveLength(1);
      expect(state.currentSession?.messages[0].isStreaming).toBe(true);
      expect(state.currentSession?.isStreaming).toBe(true);

      // Second chunk - replaces content
      updateStreamingMessage("test-session", "msg-1", [{ type: "text", text: "Hello world" }]);

      state = useSessionStore.getState();
      expect(state.currentSession?.messages).toHaveLength(1);
      const content = state.currentSession?.messages[0].content[0];
      if (content && 'text' in content) {
        expect(content.text).toBe("Hello world");
      }
    });

    it("should finalize streaming message", () => {
      const { updateStreamingMessage, finalizeMessage } = useSessionStore.getState();

      updateStreamingMessage("test-session", "msg-1", [{ type: "text", text: "Done" }]);
      finalizeMessage("test-session", "msg-1");

      const state = useSessionStore.getState();
      expect(state.currentSession?.isStreaming).toBe(false);
      expect(state.currentSession?.streamingMessageId).toBeNull();
      expect(state.currentSession?.messages[0]?.isStreaming).toBe(false);
    });
  });

  describe("selectTotalTokens Selector", () => {
    it("should calculate total tokens from currentSession messages", () => {
      useSessionStore.setState({
        currentSession: {
          id: "test-session",
          projectId: "test-project",
          userId: "test-user",
          agent: "claude",
          type: "chat",
          permission_mode: "default",
          state: "idle",
          is_archived: false,
          archived_at: null,
          created_at: new Date(),
          updated_at: new Date(),
          messages: [
            {
              id: "msg-1",
              role: "user",
              content: [{ type: "text", text: "Hello" }],
              timestamp: Date.now(),
              tool: 'claude',
              isStreaming: false,
            },
            {
              id: "msg-2",
              role: "assistant",
              content: [{ type: "text", text: "Hi!" }],
              timestamp: Date.now(),
              tool: 'claude',
              isStreaming: false,
              usage: {
                inputTokens: 10,
                outputTokens: 5,
                cacheCreationInputTokens: 0,
                cacheReadInputTokens: 0,
              },
            },
            {
              id: "msg-3",
              role: "assistant",
              content: [{ type: "text", text: "How can I help?" }],
              timestamp: Date.now(),
              tool: 'claude',
              isStreaming: false,
              usage: {
                inputTokens: 20,
                outputTokens: 10,
                cacheCreationInputTokens: 5,
                cacheReadInputTokens: 15,
              },
            },
          ],
          isStreaming: false,
          metadata: null,
          loadingState: "loaded",
          error: null,
          messageIds: new Set(["msg-1", "msg-2", "msg-3"]),
          streamingMessageId: null,
        },
      });

      const totalTokens = selectTotalTokens(useSessionStore.getState());
      // msg-2: 10 + 5 = 15
      // msg-3: 20 + 10 = 30
      // Total: 45 (cache tokens not counted)
      expect(totalTokens).toBe(45);
    });

    it("should return 0 for null currentSession", () => {
      useSessionStore.setState({
        currentSession: null,
      });

      const totalTokens = selectTotalTokens(useSessionStore.getState());
      expect(totalTokens).toBe(0);
    });
  });
});
