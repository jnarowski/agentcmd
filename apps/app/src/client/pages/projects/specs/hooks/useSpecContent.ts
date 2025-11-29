import { useQuery } from "@tanstack/react-query";
import { api } from "@/client/utils/api";

async function fetchSpecContent(
  projectId: string,
  specPath: string
): Promise<string> {
  const response = await api.get<{ content: string }>(
    `/projects/${projectId}/specs/content?specPath=${encodeURIComponent(specPath)}`
  );
  return response.content;
}

export function useSpecContent(projectId: string, specPath: string | null) {
  return useQuery({
    queryKey: ["spec-content", projectId, specPath],
    queryFn: () => fetchSpecContent(projectId, specPath!),
    enabled: Boolean(projectId && specPath),
    staleTime: 30000, // 30 seconds
  });
}
