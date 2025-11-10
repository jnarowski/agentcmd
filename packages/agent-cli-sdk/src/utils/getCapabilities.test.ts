import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getCapabilities, type AgentType } from './getCapabilities';

// Mock the detectCli functions
vi.mock('../claude/detectCli', () => ({
  detectCli: vi.fn(),
}));

vi.mock('../codex/detectCli', () => ({
  detectCli: vi.fn(),
}));

vi.mock('../gemini/detectCli', () => ({
  detectCli: vi.fn(),
}));

// Import mocked functions
import { detectCli as detectClaudeCli } from '../claude/detectCli';
import { detectCli as detectCodexCli } from '../codex/detectCli';
import { detectCli as detectGeminiCli } from '../gemini/detectCli';

describe('getCapabilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('claude', () => {
    it('should return capabilities with install detection for claude agent', async () => {
      vi.mocked(detectClaudeCli).mockResolvedValue('/usr/local/bin/claude');

      const caps = await getCapabilities('claude');

      expect(caps.supportsSlashCommands).toBe(true);
      expect(caps.supportsModels).toBe(true);
      expect(caps.models).toHaveLength(3);
      expect(caps.models[0]).toEqual({
        id: 'claude-sonnet-4-5-20250929',
        name: 'Sonnet 4.5',
      });
      expect(caps.models[1]).toEqual({
        id: 'claude-opus-4-20250514',
        name: 'Opus 4.1',
      });
      expect(caps.models[2]).toEqual({
        id: 'haiku',
        name: 'Haiku 4.5',
      });
      expect(caps.installed).toBe(true);
      expect(caps.cliPath).toBe('/usr/local/bin/claude');
    });

    it('should mark claude as not installed when CLI not found', async () => {
      vi.mocked(detectClaudeCli).mockResolvedValue(null);

      const caps = await getCapabilities('claude');

      expect(caps.installed).toBe(false);
      expect(caps.cliPath).toBeUndefined();
    });
  });

  describe('codex', () => {
    it('should return capabilities with install detection for codex agent', async () => {
      vi.mocked(detectCodexCli).mockResolvedValue('/usr/local/bin/codex');

      const caps = await getCapabilities('codex');

      expect(caps.supportsSlashCommands).toBe(false);
      expect(caps.supportsModels).toBe(true);
      expect(caps.models).toHaveLength(2);
      expect(caps.models[0]).toEqual({ id: 'gpt-5-codex', name: 'GPT-5 Codex' });
      expect(caps.models[1]).toEqual({ id: 'gpt-5', name: 'GPT-5' });
      expect(caps.installed).toBe(true);
      expect(caps.cliPath).toBe('/usr/local/bin/codex');
    });

    it('should mark codex as not installed when CLI not found', async () => {
      vi.mocked(detectCodexCli).mockResolvedValue(null);

      const caps = await getCapabilities('codex');

      expect(caps.installed).toBe(false);
      expect(caps.cliPath).toBeUndefined();
    });
  });

  describe('cursor', () => {
    it('should return capabilities for cursor agent (not implemented)', async () => {
      const caps = await getCapabilities('cursor');

      expect(caps.supportsSlashCommands).toBe(false);
      expect(caps.supportsModels).toBe(false);
      expect(caps.models).toHaveLength(0);
      expect(caps.installed).toBe(false);
      expect(caps.cliPath).toBeUndefined();
    });
  });

  describe('gemini', () => {
    it('should return capabilities with install detection for gemini agent', async () => {
      vi.mocked(detectGeminiCli).mockResolvedValue('/usr/local/bin/gemini');

      const caps = await getCapabilities('gemini');

      expect(caps.supportsSlashCommands).toBe(false);
      expect(caps.supportsModels).toBe(true);
      expect(caps.models).toHaveLength(2);
      expect(caps.models[0]).toEqual({
        id: 'gemini-2.5-pro',
        name: 'Gemini 2.5 Pro',
      });
      expect(caps.models[1]).toEqual({
        id: 'gemini-2.5-flash',
        name: 'Gemini 2.5 Flash',
      });
      expect(caps.installed).toBe(true);
      expect(caps.cliPath).toBe('/usr/local/bin/gemini');
    });

    it('should mark gemini as not installed when CLI not found', async () => {
      vi.mocked(detectGeminiCli).mockResolvedValue(null);

      const caps = await getCapabilities('gemini');

      expect(caps.installed).toBe(false);
      expect(caps.cliPath).toBeUndefined();
    });
  });

  describe('all agents', () => {
    it('should have capabilities for all agent types', async () => {
      const agents: AgentType[] = ['claude', 'codex', 'cursor', 'gemini'];

      for (const agent of agents) {
        const caps = await getCapabilities(agent);
        expect(caps).toBeDefined();
        expect(caps).toHaveProperty('supportsSlashCommands');
        expect(caps).toHaveProperty('supportsModels');
        expect(caps).toHaveProperty('models');
        expect(Array.isArray(caps.models)).toBe(true);
        expect(caps).toHaveProperty('installed');
        expect(typeof caps.installed).toBe('boolean');
      }
    });
  });
});
