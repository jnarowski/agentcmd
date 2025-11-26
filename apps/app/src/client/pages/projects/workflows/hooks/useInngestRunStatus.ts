import { useQuery } from "@tanstack/react-query";
import { api } from "@/client/utils/api";
import { workflowKeys } from "./queryKeys";
import type { InngestRunStatusResult } from "@/client/pages/projects/workflows/types";

async function fetchInngestRunStatus(
  runId: string
): Promise<InngestRunStatusResult> {
  return await api.get<InngestRunStatusResult>(
    `/api/workflow-runs/${runId}/inngest-status`
  );
}

export function useInngestRunStatus(runId: string | undefined) {
  return useQuery({
    queryKey: runId ? workflowKeys.inngestStatus(runId) : ["inngest-status"],
    queryFn: () => fetchInngestRunStatus(runId!),
    enabled: !!runId,
    retry: false,
  });
}
