import { api } from "@/client/utils/api";

/**
 * Move a spec to a different workflow folder
 */
export async function moveSpec(params: MoveSpecParams): Promise<void> {
  const { projectId, specId, targetFolder } = params;

  await api.post(`/api/projects/${projectId}/specs/${specId}/move`, {
    targetFolder,
  });
}

export interface MoveSpecParams {
  projectId: string;
  specId: string;
  targetFolder: "backlog" | "todo" | "done";
}
