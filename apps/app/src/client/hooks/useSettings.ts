/**
 * Settings Hook
 * Provides access to application settings and feature flags
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/client/utils/api';
import { settingsKeys } from './queryKeys';

type AgentType = 'claude' | 'codex' | 'gemini' | 'cursor';

interface ModelInfo {
  id: string;
  name: string;
}

interface AgentCapabilities {
  supportsSlashCommands: boolean;
  supportsModels: boolean;
  models: ModelInfo[];
  installed: boolean;
  cliPath?: string;
}

interface UserPreferences {
  default_permission_mode: 'default' | 'plan' | 'acceptEdits' | 'bypassPermissions';
  default_theme: 'light' | 'dark' | 'system';
  session_theme: 'default';
  default_agent: AgentType;
  onboarding_dismissed?: boolean;
  activity_filter?: 'all' | 'sessions' | 'workflows';
  sidebar_active_tab?: 'activities' | 'tasks';
  project_home_active_tab?: 'activities' | 'tasks';
  dismissed_content?: Record<string, boolean>;
}

interface Settings {
  features: {
    aiEnabled: boolean;
    gitEnabled: boolean;
    ghCliEnabled: boolean;
  };
  agents: Record<AgentType, AgentCapabilities>;
  userPreferences: UserPreferences;
  version: string;
}

/**
 * Fetch application settings and feature flags
 */
export function useSettings() {
  return useQuery({
    queryKey: settingsKeys.all,
    queryFn: async () => {
      const response = await api.get<{ data: Settings }>('/api/settings');
      return response.data;
    },
  });
}

/**
 * Check if AI features are enabled (ANTHROPIC_API_KEY is set)
 */
export function useIsAiEnabled() {
  const { data: settings } = useSettings();
  return settings?.features.aiEnabled ?? false;
}

/**
 * Check if GitHub CLI (gh) is installed and available
 */
export function useIsGhCliEnabled() {
  const { data: settings } = useSettings();
  return settings?.features.ghCliEnabled ?? false;
}

/**
 * Get capabilities for a specific agent
 */
export function useAgentCapabilities(agentType: AgentType) {
  const { data: settings } = useSettings();
  return settings?.agents[agentType];
}

/**
 * Update user preferences
 */
export function useUpdateSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: Partial<UserPreferences>) => {
      const response = await api.patch<{ data: Settings }>('/api/settings', updates);
      return response.data;
    },
    onSuccess: (responseData) => {
      // Update settings cache with new data
      queryClient.setQueryData(settingsKeys.all, responseData);
    },
  });
}
