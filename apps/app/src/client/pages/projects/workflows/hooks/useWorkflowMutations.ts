import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/client/utils/api';
import { toast } from 'sonner';
import type { WorkflowRun, WorkflowEvent, WorkflowArtifact } from '../types';
import { workflowKeys } from './queryKeys';

// Create workflow
interface CreateWorkflowInput {
  projectId: string;
  definitionId: string;
  name: string;
  args: Record<string, unknown>;
  spec_file?: string;
  spec_content?: string;
  spec_type?: string;
  planning_session_id?: string;
  mode?: string;
  base_branch?: string;
  branch_name?: string;
  preserve?: boolean;
}

interface CreateWorkflowResponse {
  data: WorkflowRun;
}

async function createWorkflow(input: CreateWorkflowInput): Promise<WorkflowRun> {
  const response = await api.post<CreateWorkflowResponse>(
    '/api/workflow-runs',
    {
      project_id: input.projectId,
      workflow_definition_id: input.definitionId,
      name: input.name,
      args: input.args,
      spec_file: input.spec_file,
      spec_content: input.spec_content,
      spec_type: input.spec_type,
      planning_session_id: input.planning_session_id,
      mode: input.mode,
      base_branch: input.base_branch,
      branch_name: input.branch_name,
      preserve: input.preserve,
    }
  );
  return response.data;
}

export function useCreateWorkflow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createWorkflow,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: workflowKeys.runs(),
      });
      toast.success('Workflow created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create workflow');
    },
  });
}

// Pause workflow
async function pauseWorkflow(runId: string): Promise<void> {
  await api.post(`/api/workflow-runs/${runId}/pause`);
}

export function usePauseWorkflow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: pauseWorkflow,
    onSuccess: (_data, runId) => {
      queryClient.invalidateQueries({
        queryKey: workflowKeys.run(runId),
      });
      toast.success('Workflow paused');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to pause workflow');
    },
  });
}

// Resume workflow
async function resumeWorkflow(runId: string): Promise<void> {
  await api.post(`/api/workflow-runs/${runId}/resume`);
}

export function useResumeWorkflow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: resumeWorkflow,
    onSuccess: (_data, runId) => {
      queryClient.invalidateQueries({
        queryKey: workflowKeys.run(runId),
      });
      toast.success('Workflow resumed');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to resume workflow');
    },
  });
}

// Cancel workflow
async function cancelWorkflow(runId: string): Promise<void> {
  await api.post(`/api/workflow-runs/${runId}/cancel`);
}

export function useCancelWorkflow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: cancelWorkflow,
    onMutate: async (runId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: workflowKeys.run(runId) });

      // Snapshot previous value
      const previousRun = queryClient.getQueryData<{ data: WorkflowRun }>(
        workflowKeys.run(runId)
      );

      // Optimistically update to cancelled status
      queryClient.setQueryData<{ data: WorkflowRun }>(
        workflowKeys.run(runId),
        (old) =>
          old
            ? {
                ...old,
                data: {
                  ...old.data,
                  status: 'cancelled',
                  cancelled_at: new Date().toISOString(),
                },
              }
            : old
      );

      return { previousRun };
    },
    onSuccess: (_data, runId) => {
      queryClient.invalidateQueries({
        queryKey: workflowKeys.run(runId),
      });
      toast.success('Workflow cancelled');
    },
    onError: (error: Error, runId, context) => {
      // Rollback on error
      if (context?.previousRun) {
        queryClient.setQueryData(workflowKeys.run(runId), context.previousRun);
      }
      toast.error(error.message || 'Failed to cancel workflow');
    },
  });
}

// Create annotation
interface CreateAnnotationInput {
  runId: string;
  content: string;
  stepId?: string;
}

interface CreateAnnotationResponse {
  data: WorkflowEvent;
}

async function createAnnotation(input: CreateAnnotationInput): Promise<WorkflowEvent> {
  const response = await api.post<CreateAnnotationResponse>(
    `/api/workflow-runs/${input.runId}/events`,
    {
      text: input.content,
      step_id: input.stepId,
      event_type: 'annotation_added',
    }
  );
  return response.data;
}

export function useCreateAnnotation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createAnnotation,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: workflowKeys.run(variables.runId),
      });
      toast.success('Annotation added');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to add annotation');
    },
  });
}

// Upload artifact
interface UploadArtifactInput {
  runId: string;
  stepId?: string;
  file: File;
}

interface UploadArtifactResponse {
  data: WorkflowArtifact;
}

async function uploadArtifact(input: UploadArtifactInput): Promise<WorkflowArtifact> {
  const formData = new FormData();
  formData.append('file', input.file);
  if (input.stepId) {
    formData.append('step_id', input.stepId);
  }

  const response = await api.post<UploadArtifactResponse>(
    `/api/workflow-runs/${input.runId}/artifacts`,
    formData
  );
  return response.data;
}

export function useUploadArtifact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: uploadArtifact,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: workflowKeys.run(variables.runId),
      });
      toast.success('Artifact uploaded');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to upload artifact');
    },
  });
}

// Delete workflow run
async function deleteWorkflowRun(runId: string): Promise<void> {
  await api.delete(`/api/workflow-runs/${runId}`);
}

export function useDeleteWorkflowRun() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteWorkflowRun,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: workflowKeys.runs(),
      });
      toast.success('Workflow run deleted');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete workflow run');
    },
  });
}
