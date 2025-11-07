/**
 * Tests for Gemini session loading.
 *
 * Tests parsing of full session files with multiple messages.
 */

import { describe, it, expect } from 'vitest';
import { parse } from './parse';
import type { GeminiSession } from './types';

// Import full session fixture
import fullSession from '../../tests/fixtures/gemini/full/session-2025-10-29T10-36-9c9a14e1.json';

describe('loadSession', () => {
  it('should parse full session with multiple messages', () => {
    const session = fullSession as GeminiSession;
    const messages = session.messages.map(parse);

    expect(messages.length).toBeGreaterThan(0);
    expect(messages[0]?.role).toBe('user');

    // Find assistant message
    const assistantMsg = messages.find((m) => m.role === 'assistant');
    expect(assistantMsg).toBeDefined();
  });

  it('should transform tool calls in session messages', () => {
    const session = fullSession as GeminiSession;
    const messages = session.messages.map(parse);

    // Find message with tool calls
    const msgWithTools = messages.find((m) => {
      if (Array.isArray(m.content)) {
        return m.content.some((c) => c.type === 'tool_use');
      }
      return false;
    });

    expect(msgWithTools).toBeDefined();

    if (msgWithTools && Array.isArray(msgWithTools.content)) {
      const toolUse = msgWithTools.content.find((c) => c.type === 'tool_use');
      expect(toolUse).toBeDefined();
      if (toolUse && toolUse.type === 'tool_use') {
        expect(toolUse.name).toBe('Read'); // Transformed from read_file
      }
    }
  });

  it('should preserve session metadata', () => {
    const session = fullSession as GeminiSession;

    expect(session.sessionId).toBeDefined();
    expect(session.projectHash).toBeDefined();
    expect(session.startTime).toBeDefined();
    expect(session.lastUpdated).toBeDefined();
  });

  it('should transform thoughts in session messages', () => {
    const session = fullSession as GeminiSession;
    const messages = session.messages.map(parse);

    // Find message with thinking blocks
    const msgWithThinking = messages.find((m) => {
      if (Array.isArray(m.content)) {
        return m.content.some((c) => c.type === 'thinking');
      }
      return false;
    });

    expect(msgWithThinking).toBeDefined();

    if (msgWithThinking && Array.isArray(msgWithThinking.content)) {
      const thinking = msgWithThinking.content.find((c) => c.type === 'thinking');
      expect(thinking).toBeDefined();
      if (thinking && thinking.type === 'thinking') {
        expect(thinking.thinking).toContain(':');
      }
    }
  });

  it('should preserve original message data', () => {
    const session = fullSession as GeminiSession;
    const messages = session.messages.map(parse);

    messages.forEach((msg) => {
      expect(msg._original).toBeDefined();
      expect(msg.tool).toBe('gemini');
    });
  });

  it('should handle user messages correctly', () => {
    const session = fullSession as GeminiSession;
    const messages = session.messages.map(parse);

    const userMsg = messages.find((m) => m.role === 'user');
    expect(userMsg).toBeDefined();

    if (userMsg && Array.isArray(userMsg.content)) {
      const textBlock = userMsg.content.find((c) => c.type === 'text');
      expect(textBlock).toBeDefined();
      if (textBlock && textBlock.type === 'text') {
        expect(textBlock.text).toBeTruthy();
      }
    }
  });

  it('should handle assistant messages correctly', () => {
    const session = fullSession as GeminiSession;
    const messages = session.messages.map(parse);

    const assistantMsg = messages.find((m) => m.role === 'assistant');
    expect(assistantMsg).toBeDefined();
    expect(assistantMsg?.tool).toBe('gemini');
  });

  it('should convert all timestamps to milliseconds', () => {
    const session = fullSession as GeminiSession;
    const messages = session.messages.map(parse);

    messages.forEach((msg) => {
      expect(typeof msg.timestamp).toBe('number');
      expect(msg.timestamp).toBeGreaterThan(0);
    });
  });
});
