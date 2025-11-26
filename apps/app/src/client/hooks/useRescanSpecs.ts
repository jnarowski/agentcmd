/**
 * TanStack Query mutation hook for rescanning specs
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/client/utils/api";

/**
 * Trigger spec rescan (clears server cache and rescans all projects)
 */
async function rescanSpecs(): Promise<void> {
  await api.post("/api/specs/rescan");
}

/**
 * Hook to rescan specs (clear server cache and refetch from all projects)
 */
export function useRescanSpecs() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: rescanSpecs,
    onSuccess: () => {
      // Invalidate specs query to trigger refetch
      queryClient.invalidateQueries({ queryKey: ["specs"] });
      toast.success("Specs rescanned");
    },
    onError: (error) => {
      console.error("Failed to rescan specs:", error);
      toast.error("Failed to rescan specs");
    },
  });
}
