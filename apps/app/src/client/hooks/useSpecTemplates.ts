import { useQuery } from "@tanstack/react-query";
import { api } from "@/client/utils/api";
import type { SpecTemplate } from "@/shared/types/spec.types";

interface SpecTemplatesResponse {
  data: SpecTemplate[];
}

/**
 * Hook for fetching available spec templates
 */
export function useSpecTemplates() {
  return useQuery({
    queryKey: ["spec-templates"],
    queryFn: async () => {
      const response = await api.get<SpecTemplatesResponse>("/api/specs/templates");
      return response.data;
    },
    staleTime: 1000 * 60 * 60, // 1 hour - templates rarely change
  });
}
