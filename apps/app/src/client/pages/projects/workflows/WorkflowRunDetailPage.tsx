import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { XCircle, ExternalLink, Trash2, ChevronDown } from "lucide-react";
import { WorkflowStatusBadge } from "./components/WorkflowStatusBadge";
import { PhaseTimeline } from "./components/timeline/PhaseTimeline";
import { WorkflowDetailPanel } from "./components/detail-panel/WorkflowDetailPanel";
import { DeleteWorkflowRunDialog } from "./components/DeleteWorkflowRunDialog";
import { useWorkflowRun } from "./hooks/useWorkflowRun";
import { useWorkflowDefinition } from "./hooks/useWorkflowDefinition";
import { useWorkflowWebSocket } from "./hooks/useWorkflowWebSocket";
import { useWorkflowDetailPanel } from "./hooks/useWorkflowDetailPanel";
import { useCancelWorkflow } from "./hooks/useWorkflowMutations";
import { useProjectId } from "@/client/hooks/useProjectId";
import { PageHeader } from "@/client/components/PageHeader";
import { Button } from "@/client/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/client/components/ui/dropdown-menu";

function WorkflowRunDetailPage() {
  const projectId = useProjectId();
  const { definitionId, runId } = useParams<{
    definitionId: string;
    runId: string;
  }>();
  const navigate = useNavigate();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Detail panel state
  const {
    activeTab,
    setActiveTab,
    selectedSessionId,
    setSelectedSession,
    selectedStepId,
    setSelectedStep,
    clearSelection,
  } = useWorkflowDetailPanel();

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

  // Mutations
  const cancelMutation = useCancelWorkflow();

  // Handlers
  const handleCancel = () => {
    if (!runId) return;
    cancelMutation.mutate(runId);
  };

  const handleDelete = () => {
    setDeleteDialogOpen(true);
  };

  const handleDeleteSuccess = () => {
    navigate(`/projects/${projectId}/workflows`);
  };

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
      <PageHeader
        breadcrumbs={[
          { label: "Project", href: `/projects/${projectId}` },
          { label: "Workflows", href: `/projects/${projectId}/workflows` },
          {
            label: definition.name,
            href: `/projects/${projectId}/workflows/${definitionId}`,
          },
          { label: run.name },
        ]}
        title={run.name}
        afterTitle={
          <>
            <WorkflowStatusBadge status={run.status} />
            {run.triggered_by === "webhook" && (
              <span className="inline-flex items-center gap-1.5 rounded-md bg-purple-500/10 px-2 py-1 text-xs font-medium text-purple-500 border border-purple-500/20">
                Webhook
              </span>
            )}
            {run.issue_url && (
              <a
                href={run.issue_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-blue-500 hover:text-blue-600"
                title={run.issue_id || undefined}
              >
                {run.issue_id || "View Issue"}
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {(run as any).pr_url && (
              <a
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                href={(run as any).pr_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-blue-500 hover:text-blue-600"
              >
                View PR
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </>
        }
        actions={
          <div className="flex items-center">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancel}
              disabled={
                cancelMutation.isPending ||
                run.status === "completed" ||
                run.status === "failed" ||
                run.status === "cancelled"
              }
              className="rounded-r-none border-r-0 h-9"
            >
              Cancel
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-l-none px-2 h-9"
                >
                  <ChevronDown className="h-4 w-4" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={handleDelete}
                  className="text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        }
        alerts={
          run.status === "failed" && run.error_message ? (
            <div className="rounded-md bg-red-500/10 border border-red-500/20 px-4 py-3">
              <div className="flex items-start gap-3">
                <XCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-red-500">
                    Workflow Failed
                  </h3>
                  <p className="mt-1 text-sm text-red-500/90">
                    {run.error_message}
                  </p>
                </div>
              </div>
            </div>
          ) : undefined
        }
        className="px-6 py-3"
      />

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
              onSelectStep={setSelectedStep}
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
            selectedStepId={selectedStepId}
          />
        </div>
      </div>

      {/* Delete Dialog */}
      <DeleteWorkflowRunDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        run={run}
        onSuccess={handleDeleteSuccess}
      />
    </div>
  );
}

export default WorkflowRunDetailPage;
