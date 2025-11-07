import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { ArrowLeft, Plus } from "lucide-react";
import { WorkflowRunHeader } from "./components/WorkflowRunHeader";
import { PhaseTimeline } from "./components/timeline/PhaseTimeline";
import { NewRunDialog } from "./components/NewRunDialog";
import { useWorkflowRun } from "./hooks/useWorkflowRun";
import { useWorkflowDefinition } from "./hooks/useWorkflowDefinition";
import { useWorkflowWebSocket } from "./hooks/useWorkflowWebSocket";
import {
  usePauseWorkflow,
  useResumeWorkflow,
  useCancelWorkflow,
} from "./hooks/useWorkflowMutations";

export function WorkflowRunDetail() {
  const { projectId, definitionId, runId } = useParams<{
    projectId: string;
    definitionId: string;
    runId: string;
  }>();
  const navigate = useNavigate();

  // Fetch data
  const {
    data: run,
    isLoading: runLoading,
    isError: runError,
  } = useWorkflowRun(runId);
  const {
    data: definition,
    isLoading: definitionLoading,
    isError: definitionError,
  } = useWorkflowDefinition(definitionId);

  // Redirect if run or definition not found
  useEffect(() => {
    // If run not found, go back to workflow definition view
    if (runError || (!runLoading && !run)) {
      navigate(`/projects/${projectId}/workflows/${definitionId}`, {
        replace: true,
      });
      return;
    }

    // If definition not found, go back to workflows list
    if (definitionError || (!definitionLoading && !definition)) {
      navigate(`/projects/${projectId}/workflows`, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    runError,
    runLoading,
    run,
    definitionError,
    definitionLoading,
    definition,
    projectId,
    definitionId,
  ]);

  // Subscribe to WebSocket updates
  useWorkflowWebSocket(projectId!);

  // Mutations
  const pauseWorkflow = usePauseWorkflow();
  const resumeWorkflow = useResumeWorkflow();
  const cancelWorkflow = useCancelWorkflow();

  // Dialog state
  const [showNewRunDialog, setShowNewRunDialog] = useState(false);

  const isLoading = runLoading || definitionLoading;

  if (isLoading || !run || !definition) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const handlePause = async () => {
    await pauseWorkflow.mutateAsync(runId!);
  };

  const handleResume = async () => {
    await resumeWorkflow.mutateAsync(runId!);
  };

  const handleCancel = async () => {
    await cancelWorkflow.mutateAsync(runId!);
  };

  return (
    <div className="flex h-full flex-col">
      {/* Breadcrumb navigation */}
      <div className="border-b bg-background px-6 py-3">
        <div className="flex items-center justify-between">
          <button
            onClick={() =>
              navigate(`/projects/${projectId}/workflows/${definitionId}`)
            }
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to {definition?.name || "Workflow"}
          </button>

          <button
            onClick={() => setShowNewRunDialog(true)}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            New Run
          </button>
        </div>
      </div>

      {/* Header */}
      <WorkflowRunHeader
        run={run}
        onPause={handlePause}
        onResume={handleResume}
        onCancel={handleCancel}
      />

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-5xl mx-auto">
          {/* Timeline section */}
          <section>
            <h2 className="text-xl font-bold mb-4">Execution Timeline</h2>
            <PhaseTimeline run={run} projectId={projectId!} />
          </section>
        </div>
      </div>

      {/* New Run Dialog */}
      <NewRunDialog
        open={showNewRunDialog}
        onOpenChange={setShowNewRunDialog}
        projectId={projectId!}
        definitionId={definitionId!}
        definition={definition}
      />
    </div>
  );
}
