import { useQuery } from "@tanstack/react-query";
import { api } from "@/client/utils/api";
import type { InngestRunStatusResult } from "../types";

async function fetchInngestRunStatus(
  runId: string
): Promise<InngestRunStatusResult> {
  return await api.get<InngestRunStatusResult>(
    `/api/workflow-runs/${runId}/inngest-status`
  );
}

export function useInngestRunStatus(runId: string | undefined) {
  return useQuery({
    queryKey: ["inngest-run-status", runId],
    queryFn: () => fetchInngestRunStatus(runId!),
    enabled: !!runId,
    refetchInterval: 5000, // Poll every 5 seconds
    retry: false, // Don't retry on failure
  });
}
