/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { generateSessionName } from './generateSessionName';
import { generateText } from 'ai';

// Mock the ai package
vi.mock('ai', () => ({
  generateText: vi.fn(),
}));

// Mock the anthropic SDK
vi.mock('@ai-sdk/anthropic', () => ({
  anthropic: vi.fn((modelName: string) => ({
    modelId: modelName,
    provider: 'anthropic',
    // Mock model interface properties that ai SDK expects
    doGenerate: vi.fn(),
    doStream: vi.fn(),
  })),
}));

describe('generateSessionName', () => {
  const originalApiKey = process.env.ANTHROPIC_API_KEY;

  beforeEach(() => {
    vi.clearAllMocks();
    // Set a mock API key for tests
    process.env.ANTHROPIC_API_KEY = 'test-api-key';
  });

  afterEach(() => {
    // Restore original API key
    process.env.ANTHROPIC_API_KEY = originalApiKey;
  });

  describe('API key handling', () => {
    it('should return "Untitled Session" when API key is not set', async () => {
      delete process.env.ANTHROPIC_API_KEY;

      const result = await generateSessionName({
        userPrompt: 'Fix authentication bug',
      });

      expect(result).toBe('Untitled Session');
      expect(vi.mocked(generateText)).not.toHaveBeenCalled();
    });

    it('should not log warning when API key is not set (silent fallback)', async () => {
      delete process.env.ANTHROPIC_API_KEY;
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      await generateSessionName({
        userPrompt: 'Fix authentication bug',
      });

      // Should NOT log warning - this is a silent optional feature
      expect(consoleWarnSpy).not.toHaveBeenCalled();

      consoleWarnSpy.mockRestore();
    });
  });

  describe('empty prompt handling', () => {
    it('should return "Untitled Session" for empty prompt', async () => {
      const result = await generateSessionName({
        userPrompt: '',
      });

      expect(result).toBe('Untitled Session');
      expect(vi.mocked(generateText)).not.toHaveBeenCalled();
    });

    it('should return "Untitled Session" for whitespace-only prompt', async () => {
      const result = await generateSessionName({
        userPrompt: '   \n  \t  ',
      });

      expect(result).toBe('Untitled Session');
      expect(vi.mocked(generateText)).not.toHaveBeenCalled();
    });
  });

  describe('successful name generation', () => {
    it('should generate session name from user prompt', async () => {
      vi.mocked(generateText).mockResolvedValue({
        text: 'Authentication Bug Fix',
        usage: { promptTokens: 50, completionTokens: 10, totalTokens: 60 },
        finishReason: 'stop',
      } as any);

      const result = await generateSessionName({
        userPrompt: 'Help me fix a bug in the authentication flow',
      });

      expect(result).toBe('Authentication Bug Fix');
      expect(vi.mocked(generateText)).toHaveBeenCalledWith(
        expect.objectContaining({
          model: expect.objectContaining({
            modelId: 'claude-3-7-sonnet-20250219',
            provider: 'anthropic',
          }),
          system: expect.stringContaining('You create concise 3-5 word names'),
          prompt: expect.stringContaining('Help me fix a bug in the authentication flow'),
          temperature: 0.7,
        })
      );
    });

    it('should truncate long prompts to 200 characters', async () => {
      const longPrompt = 'a'.repeat(300);
      const expectedTruncated = 'a'.repeat(200);

      vi.mocked(generateText).mockResolvedValue({
        text: 'Long Prompt Session',
        usage: { promptTokens: 50, completionTokens: 10, totalTokens: 60 },
        finishReason: 'stop',
      } as any);

      await generateSessionName({
        userPrompt: longPrompt,
      });

      expect(vi.mocked(generateText)).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: expect.stringContaining(expectedTruncated),
        })
      );

      // Verify it doesn't contain the full 300 characters
      const call = vi.mocked(generateText).mock.calls[0][0];
      expect(call.prompt).not.toContain('a'.repeat(201));
    });

    it('should remove quotes from generated name', async () => {
      vi.mocked(generateText).mockResolvedValue({
        text: '"Database Schema Update"',
        usage: { promptTokens: 50, completionTokens: 10, totalTokens: 60 },
        finishReason: 'stop',
      } as any);

      const result = await generateSessionName({
        userPrompt: 'Update the database schema',
      });

      expect(result).toBe('Database Schema Update');
    });

    it('should remove single quotes from generated name', async () => {
      vi.mocked(generateText).mockResolvedValue({
        text: "'API Integration Setup'",
        usage: { promptTokens: 50, completionTokens: 10, totalTokens: 60 },
        finishReason: 'stop',
      } as any);

      const result = await generateSessionName({
        userPrompt: 'Set up API integration',
      });

      expect(result).toBe('API Integration Setup');
    });

    it('should trim whitespace from generated name', async () => {
      vi.mocked(generateText).mockResolvedValue({
        text: '  React Component Update  ',
        usage: { promptTokens: 50, completionTokens: 10, totalTokens: 60 },
        finishReason: 'stop',
      } as any);

      const result = await generateSessionName({
        userPrompt: 'Update React component',
      });

      expect(result).toBe('React Component Update');
    });

    it('should use system prompt for concise names', async () => {
      vi.mocked(generateText).mockResolvedValue({
        text: 'Testing Session Names',
        usage: { promptTokens: 50, completionTokens: 10, totalTokens: 60 },
        finishReason: 'stop',
      } as any);

      await generateSessionName({
        userPrompt: 'Testing the session name generation',
      });

      expect(vi.mocked(generateText)).toHaveBeenCalledWith(
        expect.objectContaining({
          system: expect.stringContaining('EXACTLY 3-5 words'),
        })
      );
    });
  });

  describe('error handling', () => {
    it('should return "Untitled Session" when generateText throws error', async () => {
      vi.mocked(generateText).mockRejectedValue(new Error('API error'));

      const result = await generateSessionName({
        userPrompt: 'Fix the bug',
      });

      expect(result).toBe('Untitled Session');
      // Note: Error is silently caught as this is an optional feature
    });

    it('should return "Untitled Session" when generateText returns empty text', async () => {
      vi.mocked(generateText).mockResolvedValue({
        text: '',
        usage: { promptTokens: 50, completionTokens: 0, totalTokens: 50 },
        finishReason: 'stop',
      } as any);

      const result = await generateSessionName({
        userPrompt: 'Do something',
      });

      expect(result).toBe('Untitled Session');
    });

    it('should return "Untitled Session" when generateText returns only whitespace', async () => {
      vi.mocked(generateText).mockResolvedValue({
        text: '   \n  ',
        usage: { promptTokens: 50, completionTokens: 2, totalTokens: 52 },
        finishReason: 'stop',
      } as any);

      const result = await generateSessionName({
        userPrompt: 'Do something',
      });

      expect(result).toBe('Untitled Session');
    });
  });

  describe('real-world prompts', () => {
    it('should handle debugging prompts', async () => {
      vi.mocked(generateText).mockResolvedValue({
        text: 'WebSocket Connection Debug',
        usage: { promptTokens: 60, completionTokens: 12, totalTokens: 72 },
        finishReason: 'stop',
      } as any);

      const result = await generateSessionName({
        userPrompt: 'The WebSocket connection keeps dropping, can you help me debug this?',
      });

      expect(result).toBe('WebSocket Connection Debug');
    });

    it('should handle feature request prompts', async () => {
      vi.mocked(generateText).mockResolvedValue({
        text: 'Add Dark Mode Toggle',
        usage: { promptTokens: 55, completionTokens: 11, totalTokens: 66 },
        finishReason: 'stop',
      } as any);

      const result = await generateSessionName({
        userPrompt: 'Add a dark mode toggle to the settings page',
      });

      expect(result).toBe('Add Dark Mode Toggle');
    });

    it('should handle refactoring prompts', async () => {
      vi.mocked(generateText).mockResolvedValue({
        text: 'Refactor User Service',
        usage: { promptTokens: 58, completionTokens: 10, totalTokens: 68 },
        finishReason: 'stop',
      } as any);

      const result = await generateSessionName({
        userPrompt: 'Refactor the user service to use dependency injection',
      });

      expect(result).toBe('Refactor User Service');
    });

    it('should handle code review prompts', async () => {
      vi.mocked(generateText).mockResolvedValue({
        text: 'Review Authentication Code',
        usage: { promptTokens: 52, completionTokens: 10, totalTokens: 62 },
        finishReason: 'stop',
      } as any);

      const result = await generateSessionName({
        userPrompt: 'Can you review my authentication implementation?',
      });

      expect(result).toBe('Review Authentication Code');
    });
  });
});
