import { useQuery } from "@tanstack/react-query";
import { api } from "@/client/utils/api";
import type { Container } from "../types/container.types";
import { containerQueryKeys } from "./queryKeys";

interface ContainerResponse {
  data: Container;
}

async function fetchContainer(containerId: string): Promise<Container> {
  const response = await api.get<ContainerResponse>(
    `/api/containers/${containerId}`,
  );
  return response.data;
}

export function useContainer(containerId: string) {
  return useQuery({
    queryKey: containerQueryKeys.detail(containerId),
    queryFn: () => fetchContainer(containerId),
    enabled: !!containerId,
  });
}
