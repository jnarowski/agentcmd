import { useQuery } from "@tanstack/react-query";
import { api } from "@/client/utils/api";
import type { Container } from "../types/container.types";
import { containerQueryKeys } from "./queryKeys";

interface ContainersResponse {
  data: Container[];
}

async function fetchContainers(
  projectId: string,
  status?: string,
): Promise<Container[]> {
  const params = status ? `?status=${status}` : "";
  const response = await api.get<ContainersResponse>(
    `/api/projects/${projectId}/containers${params}`,
  );
  return response.data;
}

export function useContainers(projectId: string, status?: string) {
  return useQuery({
    queryKey: containerQueryKeys.list(projectId, status),
    queryFn: () => fetchContainers(projectId, status),
    enabled: !!projectId,
  });
}
