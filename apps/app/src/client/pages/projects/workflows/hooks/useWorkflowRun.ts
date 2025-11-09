import { useQuery } from '@tanstack/react-query';
import { api } from '@/client/utils/api';
import type { WorkflowRunDetail } from '../types';
import { workflowKeys } from './queryKeys';

interface WorkflowRunResponse {
  data: WorkflowRunDetail;
}

async function fetchWorkflowRun(
  runId: string
): Promise<WorkflowRunDetail> {
  const response = await api.get<WorkflowRunResponse>(
    `/api/workflow-runs/${runId}`
  );
  return response.data;
}

export function useWorkflowRun(runId: string | undefined) {
  return useQuery({
    queryKey: runId ? workflowKeys.run(runId) : ['workflow-run'],
    queryFn: () => fetchWorkflowRun(runId!),
    enabled: !!runId,
  });
}
