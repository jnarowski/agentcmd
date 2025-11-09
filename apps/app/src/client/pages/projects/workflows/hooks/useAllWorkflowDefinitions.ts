import { useQuery } from '@tanstack/react-query';
import { api } from '@/client/utils/api';
import { workflowKeys } from './queryKeys';

interface WorkflowDefinition {
  id: string;
  name: string;
  description?: string;
  status: 'active' | 'archived';
  project_id: string | null;
  scope: 'project' | 'global';
  phases: unknown;
  args_schema: unknown;
  created_at: string;
  updated_at: string;
  _count: {
    runs: number;
    activeRuns: number;
  };
}

interface WorkflowDefinitionsResponse {
  data: WorkflowDefinition[];
}

async function fetchAllWorkflowDefinitions(
  status?: 'active' | 'archived'
): Promise<WorkflowDefinition[]> {
  const params = new URLSearchParams();
  if (status) {
    params.append('status', status);
  }

  const url = `/api/workflow-definitions${params.toString() ? `?${params.toString()}` : ''}`;
  const response = await api.get<WorkflowDefinitionsResponse>(url);

  // Parse JSON fields
  return response.data.map((def) => ({
    ...def,
    phases: typeof def.phases === 'string' ? JSON.parse(def.phases) : def.phases,
    args_schema:
      typeof def.args_schema === 'string'
        ? JSON.parse(def.args_schema)
        : def.args_schema,
  }));
}

/**
 * Fetch all workflow definitions for the current user (across all projects)
 * Used for user-wide views like sidebar activities
 */
export function useAllWorkflowDefinitions(status?: 'active' | 'archived') {
  return useQuery({
    queryKey: workflowKeys.allDefinitions(status),
    queryFn: () => fetchAllWorkflowDefinitions(status),
  });
}
