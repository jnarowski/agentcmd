import { useQuery } from '@tanstack/react-query';
import { api } from '@/client/utils/api';
import type { WorkflowRunDetail } from '../types';

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
    queryKey: ['workflow-run', runId],
    queryFn: () => fetchWorkflowRun(runId!),
    refetchInterval: 5000, // 5 seconds - more frequent for detail view
    enabled: !!runId,
  });
}
