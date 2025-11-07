import type { ValidateAgentSupportedOptions } from '../types/ValidateAgentSupportedOptions';

/**
 * Validate that an agent type is supported
 *
 * Checks if the agent type is one of the supported agent implementations.
 * Used before executing agent commands to prevent errors.
 */
export async function validateAgentSupported({
  agent
}: ValidateAgentSupportedOptions): Promise<{ supported: boolean; error?: string }> {
  // Supported agents
  const supportedAgents = ["claude", "codex"];

  if (!supportedAgents.includes(agent)) {
    return {
      supported: false,
      error: `Agent type '${agent}' is not yet implemented`,
    };
  }

  return { supported: true };
}
