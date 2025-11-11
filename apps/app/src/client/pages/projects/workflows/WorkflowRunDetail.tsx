import { useParams, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { ArrowLeft, Plus, XCircle } from "lucide-react";
import { WorkflowStatusBadge } from "./components/WorkflowStatusBadge";
import { PhaseTimeline } from "./components/timeline/PhaseTimeline";
import { WorkflowDetailPanel } from "./components/detail-panel/WorkflowDetailPanel";
import { useWorkflowRun } from "./hooks/useWorkflowRun";
import { useWorkflowDefinition } from "./hooks/useWorkflowDefinition";
import { useWorkflowWebSocket } from "./hooks/useWorkflowWebSocket";
import { useWorkflowDetailPanel } from "./hooks/useWorkflowDetailPanel";

export function WorkflowRunDetail() {
  const { projectId, definitionId, runId } = useParams<{
    projectId: string;
    definitionId: string;
    runId: string;
  }>();
  const navigate = useNavigate();

  // Detail panel state
  const { activeTab, setActiveTab, selectedSessionId, setSelectedSession, clearSelection } = useWorkflowDetailPanel();

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

  // Clear selected session when runId changes
  useEffect(() => {
    clearSelection();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runId]);

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

  const isLoading = runLoading || definitionLoading;

  if (isLoading || !run || !definition) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b bg-background px-6 py-3">
        <div className="flex items-center justify-between gap-6">
          {/* Run name and badge */}
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold">{run.name}</h1>
            <WorkflowStatusBadge status={run.status} />
          </div>

          {/* Navigation buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={() =>
                navigate(`/projects/${projectId}/workflows/${definitionId}`)
              }
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>

            <button
              onClick={() => navigate(`/projects/${projectId}/workflows/${definitionId}/new`)}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              New Run
            </button>
          </div>
        </div>

        {/* Error Alert */}
        {run.status === "failed" && run.error_message && (
          <div className="mt-3 rounded-md bg-red-500/10 border border-red-500/20 px-4 py-3">
            <div className="flex items-start gap-3">
              <XCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium text-red-500">Workflow Failed</h3>
                <p className="mt-1 text-sm text-red-500/90">{run.error_message}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Content - Split Pane Layout */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 overflow-hidden">
        {/* Left Pane - Phase Timeline */}
        <div className="flex flex-col overflow-hidden">
          <div className="border-b px-6 py-4">
            <h2 className="text-xl font-bold">Execution Timeline</h2>
          </div>
          <div className="flex-1 overflow-y-auto">
            <PhaseTimeline
              run={run}
              projectId={projectId!}
              onSelectSession={setSelectedSession}
              onSetActiveTab={setActiveTab}
            />
          </div>
        </div>

        {/* Right Pane - Detail Panel (hidden on mobile) */}
        <div className="hidden md:flex flex-col border-l overflow-hidden">
          <WorkflowDetailPanel
            run={run}
            projectId={projectId!}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            selectedSessionId={selectedSessionId}
          />
        </div>
      </div>
    </div>
  );
}
