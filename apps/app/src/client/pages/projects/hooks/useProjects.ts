import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryResult,
  type UseMutationResult,
} from "@tanstack/react-query";
import { toast } from "sonner";
import type {
  Project,
  CreateProjectRequest,
  UpdateProjectRequest,
  ProjectsResponse,
  ProjectResponse,
} from "@/shared/types/project.types";
import { api } from "@/client/utils/api";
import { projectKeys } from "./queryKeys";
import { useProjectsStore } from "@/client/stores/useProjectsStore";

// Re-export projectKeys for backward compatibility
export { projectKeys };

/**
 * Fetch all projects
 */
async function fetchProjects(): Promise<Project[]> {
  const data = await api.get<ProjectsResponse>("/api/projects");
  return data.data;
}

/**
 * Fetch a single project by ID
 */
async function fetchProject(id: string): Promise<Project> {
  const data = await api.get<ProjectResponse>(`/api/projects/${id}`);
  return data.data;
}

/**
 * Create a new project
 */
async function createProject(project: CreateProjectRequest): Promise<Project> {
  const data = await api.post<ProjectResponse>("/api/projects", project);
  return data.data;
}

/**
 * Update a project
 */
async function updateProject(
  id: string,
  project: UpdateProjectRequest
): Promise<Project> {
  const data = await api.patch<ProjectResponse>(`/api/projects/${id}`, project);
  return data.data;
}

/**
 * Delete a project
 */
async function deleteProject(id: string): Promise<Project> {
  const data = await api.delete<ProjectResponse>(`/api/projects/${id}`);
  return data.data;
}

/**
 * Toggle project hidden state
 */
async function toggleProjectHidden(
  id: string,
  is_hidden: boolean
): Promise<Project> {
  const data = await api.patch<ProjectResponse>(`/api/projects/${id}/hide`, {
    is_hidden,
  });
  return data.data;
}

/**
 * Toggle project starred state
 */
async function toggleProjectStarred(
  id: string,
  is_starred: boolean
): Promise<Project> {
  const data = await api.patch<ProjectResponse>(`/api/projects/${id}/star`, {
    is_starred,
  });
  return data.data;
}

/**
 * Hook to fetch all projects
 */
export function useProjects(): UseQueryResult<Project[], Error> {
  return useQuery({
    queryKey: projectKeys.list(),
    queryFn: () => fetchProjects(),
  });
}

/**
 * Hook to fetch a single project
 */
export function useProject(id: string): UseQueryResult<Project, Error> {
  return useQuery({
    queryKey: projectKeys.detail(id),
    queryFn: () => fetchProject(id),
    enabled: !!id, // Only run if id is provided
  });
}

/**
 * Hook to create a new project
 */
export function useCreateProject(): UseMutationResult<
  Project,
  Error,
  CreateProjectRequest
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (project) => createProject(project),
    onSuccess: (newProject) => {
      // Invalidate and refetch project lists
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });

      // Optionally add the new project to cache optimistically
      queryClient.setQueryData<Project[]>(projectKeys.list(), (old) => {
        return old ? [newProject, ...old] : [newProject];
      });

      toast.success("Project created successfully");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create project");
    },
  });
}

/**
 * Hook to update a project
 */
export function useUpdateProject(): UseMutationResult<
  Project,
  Error,
  { id: string; data: UpdateProjectRequest }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => updateProject(id, data),
    onSuccess: (updatedProject) => {
      // Update the project in the list cache
      queryClient.setQueryData<Project[]>(projectKeys.list(), (old) => {
        if (!old) return [updatedProject];
        return old.map((project) =>
          project.id === updatedProject.id ? updatedProject : project
        );
      });

      // Update the individual project cache
      queryClient.setQueryData(
        projectKeys.detail(updatedProject.id),
        updatedProject
      );

      toast.success("Project updated successfully");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update project");
    },
  });
}

/**
 * Hook to delete a project
 */
export function useDeleteProject(): UseMutationResult<Project, Error, string> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => deleteProject(id),
    onSuccess: (deletedProject) => {
      // Remove the project from the list cache
      queryClient.setQueryData<Project[]>(projectKeys.list(), (old) => {
        if (!old) return [];
        return old.filter((project) => project.id !== deletedProject.id);
      });

      // Remove the individual project cache
      queryClient.removeQueries({
        queryKey: projectKeys.detail(deletedProject.id),
      });

      toast.success("Project deleted successfully");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete project");
    },
  });
}

/**
 * Sync projects from Claude CLI (fire-and-forget)
 */
async function syncProjects(): Promise<{ status: string }> {
  const data = await api.post<{ data: { status: string } }>(
    "/api/projects/sync"
  );
  return data.data;
}

/**
 * Hook to trigger project sync (fire-and-forget pattern)
 * Returns isSyncing state and triggerSync function
 * Completion handled via WebSocket event in AppLayout
 */
export function useSyncProjects() {
  const isSyncing = useProjectsStore((state) => state.isSyncing);
  const setIsSyncing = useProjectsStore((state) => state.setIsSyncing);

  const triggerSync = async () => {
    setIsSyncing(true);
    try {
      await syncProjects();
      // Note: isSyncing will be set to false by WebSocket listener in AppLayout
    } catch (error) {
      console.error("[useSyncProjects] Failed to trigger sync:", error);
      setIsSyncing(false);
    }
  };

  return { isSyncing, triggerSync, setIsSyncing };
}

/**
 * Hook to manually sync projects from Claude CLI (fire-and-forget)
 * Use this for a "Sync Now" button or manual refresh action.
 * Note: This is now fire-and-forget. Completion is handled by WebSocket event.
 */
export function useSyncProjectsMutation(): UseMutationResult<
  { status: string },
  Error,
  void
> {
  return useMutation({
    mutationFn: () => syncProjects(),
    onSuccess: () => {
      toast.success("Project sync initiated");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to initiate sync");
    },
  });
}

/**
 * Hook to toggle project hidden state
 */
export function useToggleProjectHidden(): UseMutationResult<
  Project,
  Error,
  { id: string; is_hidden: boolean }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, is_hidden }) => toggleProjectHidden(id, is_hidden),
    onSuccess: (updatedProject) => {
      // Update the project in the list cache
      queryClient.setQueryData<Project[]>(projectKeys.list(), (old) => {
        if (!old) return [updatedProject];
        return old.map((project) =>
          project.id === updatedProject.id ? updatedProject : project
        );
      });

      // Update the individual project cache
      queryClient.setQueryData(
        projectKeys.detail(updatedProject.id),
        updatedProject
      );

      // Invalidate queries to ensure consistency
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });

      // Show success toast
      const action = updatedProject.is_hidden ? "hidden" : "unhidden";
      toast.success(`Project ${action} successfully`);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update project visibility");
    },
  });
}

/**
 * Hook to toggle project starred state
 */
export function useToggleProjectStarred(): UseMutationResult<
  Project,
  Error,
  { id: string; is_starred: boolean }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, is_starred }) => toggleProjectStarred(id, is_starred),
    onSuccess: (updatedProject) => {
      // Update the project in the list cache
      queryClient.setQueryData<Project[]>(projectKeys.list(), (old) => {
        if (!old) return [updatedProject];
        return old.map((project) =>
          project.id === updatedProject.id ? updatedProject : project
        );
      });

      // Update the individual project cache
      queryClient.setQueryData(
        projectKeys.detail(updatedProject.id),
        updatedProject
      );

      // Invalidate queries to ensure consistency
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });

      // Show success toast
      const action = updatedProject.is_starred ? "starred" : "unstarred";
      toast.success(`Project ${action} successfully`);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update project starred status");
    },
  });
}

/**
 * Fetch README content for a project
 */
async function fetchProjectReadme(projectId: string): Promise<{ content: string; path: string }> {
  const data = await api.get<{ content: string; path: string }>(`/api/projects/${projectId}/readme`);
  return data;
}

/**
 * Hook to fetch project README.md content
 */
export function useProjectReadme(projectId: string): UseQueryResult<{ content: string; path: string }, Error> {
  return useQuery({
    queryKey: projectKeys.readme(projectId),
    queryFn: () => fetchProjectReadme(projectId),
    enabled: !!projectId,
    retry: false, // Don't retry if README doesn't exist
  });
}

/**
 * Workflow SDK install result type
 */
export interface WorkflowPackageInstallResult {
  success: boolean;
  message: string;
  output?: string;
}

/**
 * Install agentcmd-workflows package in a project
 */
async function installWorkflowPackage(projectId: string): Promise<WorkflowPackageInstallResult> {
  const data = await api.post<{ data: WorkflowPackageInstallResult }>(
    `/api/projects/${projectId}/workflow-package/install`
  );
  return data.data;
}

/**
 * Hook to install agentcmd-workflows package
 */
export function useInstallWorkflowPackage(): UseMutationResult<
  WorkflowPackageInstallResult,
  Error,
  string
> {
  return useMutation({
    mutationFn: (projectId) => installWorkflowPackage(projectId),
    onSuccess: () => {
      // Note: Query invalidation removed - dialog handles refresh timing
      // The dialog will trigger refresh when user closes it
    },
    onError: (error) => {
      toast.error(error.message || "Failed to install agentcmd-workflows");
    },
  });
}
