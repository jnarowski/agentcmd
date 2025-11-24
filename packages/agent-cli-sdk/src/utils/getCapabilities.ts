import { detectCli as detectClaudeCli } from '../claude/detectCli';
import { detectCli as detectCodexCli } from '../codex/detectCli';
import { detectCli as detectGeminiCli } from '../gemini/detectCli';

/**
 * Agent type representing supported AI CLI tools.
 */
export type AgentType = 'claude' | 'codex' | 'gemini' | 'cursor';

/**
 * Model information for an AI agent.
 */
export interface ModelInfo {
  /** Unique model identifier */
  id: string;
  /** Human-readable model name */
  name: string;
}

/**
 * Capability flags for each AI CLI tool.
 */
export interface AgentCapabilities {
  /** Whether the agent supports slash commands */
  supportsSlashCommands: boolean;
  /** Whether the agent supports model selection */
  supportsModels: boolean;
  /** Available models for this agent */
  models: ModelInfo[];
  /** Whether the agent CLI is installed on the system */
  installed: boolean;
  /** Path to the CLI executable (if installed) */
  cliPath?: string;
}

/**
 * Map of static agent capabilities by agent type (without install detection).
 */
const AGENT_CAPABILITIES_MAP: Record<AgentType, Omit<AgentCapabilities, 'installed' | 'cliPath'>> = {
  claude: {
    supportsSlashCommands: true,
    supportsModels: true,
    models: [
      { id: 'claude-sonnet-4-5-20250929', name: 'Sonnet 4.5' },
      { id: 'claude-opus-4-5-20251124', name: 'Opus 4.5' },
      { id: 'haiku', name: 'Haiku 4.5' },
    ],
  },
  codex: {
    supportsSlashCommands: false,
    supportsModels: true,
    models: [
      { id: 'gpt-5-codex', name: 'GPT-5 Codex' },
      { id: 'gpt-5', name: 'GPT-5' },
    ],
  },
  cursor: {
    supportsSlashCommands: false,
    supportsModels: false,
    models: [],
  },
  gemini: {
    supportsSlashCommands: false,
    supportsModels: true,
    models: [
      { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro' },
      { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
    ],
  },
};

/**
 * Get capability flags for a specific AI CLI tool, including installation detection.
 *
 * @param agentName - The name of the AI CLI tool
 * @returns Promise resolving to capability flags including install status
 *
 * @example
 * ```typescript
 * import { getCapabilities } from '@repo/agent-cli-sdk';
 *
 * const caps = await getCapabilities('claude');
 *
 * if (caps.installed) {
 *   console.log(`Claude CLI found at: ${caps.cliPath}`);
 * }
 *
 * if (caps.supportsSlashCommands) {
 *   // Show slash command UI
 * }
 *
 * if (caps.supportsModels && caps.models.length > 0) {
 *   // Show model selector with available models
 * }
 * ```
 */
export async function getCapabilities(agentName: AgentType): Promise<AgentCapabilities> {
  const staticCapabilities = AGENT_CAPABILITIES_MAP[agentName];

  // Detect CLI installation based on agent type
  let cliPath: string | null = null;

  switch (agentName) {
    case 'claude':
      cliPath = await detectClaudeCli();
      break;
    case 'codex':
      cliPath = await detectCodexCli();
      break;
    case 'gemini':
      cliPath = await detectGeminiCli();
      break;
    case 'cursor':
      // No detection available yet
      cliPath = null;
      break;
    default: {
      // Exhaustive check - this should never be reached
      const _exhaustive: never = agentName;
      // Use void to suppress unused variable warning
      void _exhaustive;
      throw new Error(`Unknown agent type: ${String(agentName)}`);
    }
  }

  return {
    ...staticCapabilities,
    installed: cliPath !== null,
    cliPath: cliPath ?? undefined,
  };
}
