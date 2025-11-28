import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/client/utils/api";
import type { Container } from "../types/container.types";
import { containerQueryKeys } from "./queryKeys";

interface StopContainerResponse {
  data: Container;
}

async function stopContainer(containerId: string): Promise<Container> {
  const response = await api.delete<StopContainerResponse>(
    `/api/containers/${containerId}`,
  );
  return response.data;
}

export function useStopContainer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (containerId: string) => stopContainer(containerId),
    onSuccess: (container) => {
      // Invalidate container detail query
      queryClient.invalidateQueries({
        queryKey: containerQueryKeys.detail(container.id),
      });

      // Invalidate containers list for this project
      queryClient.invalidateQueries({
        queryKey: containerQueryKeys.list(container.project_id),
      });
    },
  });
}
