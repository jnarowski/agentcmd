import { describe, it, expect } from "vitest";
import { generateUUID } from "@/client/utils/cn";

/**
 * This is a minimal reproduction test for the message replacement bug
 * without importing the full sessionStore (which has dependency issues in tests)
 */

interface ContentBlock {
  type: string;
  text?: string;
  name?: string;
  id?: string;
  input?: Record<string, unknown>;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: ContentBlock[];
  timestamp: number;
  isStreaming?: boolean;
}

/**
 * Simplified version of updateStreamingMessage logic
 * This is what the sessionStore currently does (OLD BUGGY BEHAVIOR)
 */
function updateStreamingMessageCurrentBehavior(
  messages: Message[],
  contentBlocks: ContentBlock[]
): Message[] {
  const lastMessage = messages[messages.length - 1];

  const canUpdateLastMessage =
    lastMessage &&
    lastMessage.role === "assistant" &&
    lastMessage.isStreaming === true;

  if (canUpdateLastMessage) {
    // Update existing streaming message
    return [
      ...messages.slice(0, -1),
      {
        ...lastMessage,
        content: contentBlocks,
      },
    ];
  } else {
    // Create new streaming assistant message
    return [
      ...messages,
      {
        id: generateUUID(),
        role: "assistant" as const,
        content: contentBlocks,
        timestamp: Date.now(),
        isStreaming: true,
      },
    ];
  }
}

/**
 * Fixed version of updateStreamingMessage with message ID tracking
 * This is what the sessionStore should do (FIXED BEHAVIOR)
 */
function updateStreamingMessageFixed(
  messages: Message[],
  messageId: string,
  contentBlocks: ContentBlock[]
): Message[] {
  const lastMessage = messages[messages.length - 1];

  // Check if last message has the same ID (update existing message)
  const shouldUpdateLastMessage =
    lastMessage &&
    lastMessage.role === "assistant" &&
    lastMessage.isStreaming === true &&
    lastMessage.id === messageId;

  if (shouldUpdateLastMessage) {
    // Update existing streaming message with same ID
    return [
      ...messages.slice(0, -1),
      {
        ...lastMessage,
        content: contentBlocks,
      },
    ];
  } else {
    // Create new streaming assistant message with the provided ID
    return [
      ...messages,
      {
        id: messageId,
        role: "assistant" as const,
        content: contentBlocks,
        timestamp: Date.now(),
        isStreaming: true,
      },
    ];
  }
}

describe("updateStreamingMessage behavior", () => {
  it("REGRESSION: demonstrates that multiple assistant messages replace each other instead of appending", () => {
    let messages: Message[] = [];

    // First assistant message with Read tool (simulates first stream event)
    messages = updateStreamingMessageCurrentBehavior(messages, [
      { type: "text", text: "Let me read that file" },
      { type: "tool_use", id: "tool-1", name: "Read", input: { file_path: "/test.txt" } },
    ]);

    expect(messages).toHaveLength(1);
    expect(messages[0].content).toHaveLength(2);
    const firstBlock = messages[0].content[1];
    if ('name' in firstBlock) {
      expect(firstBlock.name).toBe("Read");
    }

    // Second assistant message with Glob tool (simulates second stream event)
    // BUG: This replaces the first message instead of appending a new one
    messages = updateStreamingMessageCurrentBehavior(messages, [
      { type: "text", text: "Now let me search for files" },
      { type: "tool_use", id: "tool-2", name: "Glob", input: { pattern: "*.ts" } },
    ]);

    // CURRENT BEHAVIOR (BUG): Only 1 message exists, content replaced
    expect(messages).toHaveLength(1);
    const secondBlock = messages[0].content[1];
    if ('name' in secondBlock) {
      expect(secondBlock.name).toBe("Glob"); // Read is gone!
    }

    // EXPECTED BEHAVIOR (what should happen):
    // expect(messages).toHaveLength(2);
    // const msg0Block = messages[0].content[1];
    // if ('name' in msg0Block) expect(msg0Block.name).toBe("Read");
    // const msg1Block = messages[1].content[1];
    // if ('name' in msg1Block) expect(msg1Block.name).toBe("Glob");

    // This test PASSES showing the bug exists
    // When fixed, uncomment the expected behavior above and comment out the current behavior
  });

  it("correctly identifies that the issue is: last message is streaming = true", () => {
    let messages: Message[] = [];

    // First call creates a streaming message
    messages = updateStreamingMessageCurrentBehavior(messages, [
      { type: "text", text: "First" },
    ]);

    expect(messages[0].isStreaming).toBe(true);

    // Second call sees last message has isStreaming=true, so it UPDATES instead of APPENDING
    messages = updateStreamingMessageCurrentBehavior(messages, [
      { type: "text", text: "Second" },
    ]);

    // Bug confirmed: still only 1 message
    expect(messages).toHaveLength(1);
    const textBlock = messages[0].content[0];
    if ('text' in textBlock) {
      expect(textBlock.text).toBe("Second"); // First is gone
    }
  });

  it("FIXED: multiple assistant messages with different IDs append as separate messages", () => {
    let messages: Message[] = [];

    // First assistant message with Read tool (simulates first stream event with msg_01ABC)
    messages = updateStreamingMessageFixed(messages, "msg_01ABC", [
      { type: "text", text: "Let me read that file" },
      { type: "tool_use", id: "tool-1", name: "Read", input: { file_path: "/test.txt" } },
    ]);

    expect(messages).toHaveLength(1);
    expect(messages[0].id).toBe("msg_01ABC");
    expect(messages[0].content).toHaveLength(2);
    const firstBlock = messages[0].content[1];
    if ('name' in firstBlock) {
      expect(firstBlock.name).toBe("Read");
    }

    // Second assistant message with Glob tool (simulates second stream event with msg_02DEF)
    // FIXED: Different message ID means this should append as a NEW message
    messages = updateStreamingMessageFixed(messages, "msg_02DEF", [
      { type: "text", text: "Now let me search for files" },
      { type: "tool_use", id: "tool-2", name: "Glob", input: { pattern: "*.ts" } },
    ]);

    // EXPECTED BEHAVIOR (FIXED): 2 messages exist, both visible
    expect(messages).toHaveLength(2);
    expect(messages[0].id).toBe("msg_01ABC");
    const msg0Block = messages[0].content[1];
    if ('name' in msg0Block) {
      expect(msg0Block.name).toBe("Read");
    }
    expect(messages[1].id).toBe("msg_02DEF");
    const msg1Block = messages[1].content[1];
    if ('name' in msg1Block) {
      expect(msg1Block.name).toBe("Glob");
    }
  });

  it("FIXED: multiple updates to the same message ID update the existing message", () => {
    let messages: Message[] = [];

    // First stream chunk for message msg_01ABC
    messages = updateStreamingMessageFixed(messages, "msg_01ABC", [
      { type: "text", text: "Thinking..." },
    ]);

    expect(messages).toHaveLength(1);
    expect(messages[0].id).toBe("msg_01ABC");
    const firstTextBlock = messages[0].content[0];
    if ('text' in firstTextBlock) {
      expect(firstTextBlock.text).toBe("Thinking...");
    }

    // Second stream chunk for SAME message msg_01ABC (incremental update)
    messages = updateStreamingMessageFixed(messages, "msg_01ABC", [
      { type: "text", text: "Thinking... done!" },
      { type: "tool_use", id: "tool-1", name: "Read", input: { file_path: "/test.txt" } },
    ]);

    // Should still be 1 message, but with updated content
    expect(messages).toHaveLength(1);
    expect(messages[0].id).toBe("msg_01ABC");
    expect(messages[0].content).toHaveLength(2);
    const secondTextBlock = messages[0].content[0];
    if ('text' in secondTextBlock) {
      expect(secondTextBlock.text).toBe("Thinking... done!");
    }
  });

  it("FIXED: demonstrates the complete workflow with multiple messages", () => {
    let messages: Message[] = [];

    // Message 1: Read tool
    messages = updateStreamingMessageFixed(messages, "msg_01", [
      { type: "text", text: "Reading file..." },
      { type: "tool_use", id: "tool-1", name: "Read", input: { file_path: "/test.txt" } },
    ]);

    // Message 2: Glob tool (different ID, should append)
    messages = updateStreamingMessageFixed(messages, "msg_02", [
      { type: "text", text: "Searching files..." },
      { type: "tool_use", id: "tool-2", name: "Glob", input: { pattern: "*.ts" } },
    ]);

    // Message 3: Edit tool (different ID, should append)
    messages = updateStreamingMessageFixed(messages, "msg_03", [
      { type: "text", text: "Editing file..." },
      { type: "tool_use", id: "tool-3", name: "Edit", input: { file_path: "/test.txt" } },
    ]);

    // All three messages should be visible
    expect(messages).toHaveLength(3);
    expect(messages[0].id).toBe("msg_01");
    const msg0Block = messages[0].content[1];
    if ('name' in msg0Block) {
      expect(msg0Block.name).toBe("Read");
    }
    expect(messages[1].id).toBe("msg_02");
    const msg1Block = messages[1].content[1];
    if ('name' in msg1Block) {
      expect(msg1Block.name).toBe("Glob");
    }
    expect(messages[2].id).toBe("msg_03");
    const msg2Block = messages[2].content[1];
    if ('name' in msg2Block) {
      expect(msg2Block.name).toBe("Edit");
    }
  });
});
