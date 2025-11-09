import { useQuery } from "@tanstack/react-query";
import { api } from "@/client/utils/api";
import { sessionKeys } from "./queryKeys";

export interface SessionFileData {
  content: string;
  path: string;
}

/**
 * Fetch raw JSONL session file content
 * Used for debugging and inspecting session data
 */
export function useSessionFile(sessionId: string, enabled = true) {
  return useQuery({
    queryKey: sessionKeys.file(sessionId),
    queryFn: async () => {
      const response = await api.get<{ data: SessionFileData }>(
        `/api/sessions/${sessionId}/file`
      );
      return response.data;
    },
    enabled,
  });
}
