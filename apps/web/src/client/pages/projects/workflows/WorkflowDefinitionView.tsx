/* eslint-disable @typescript-eslint/no-explicit-any */
import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { ArrowLeft, Plus } from "lucide-react";
import { WorkflowPhaseKanbanColumn } from "./components/WorkflowPhaseKanbanColumn";
import { NewRunDialog } from "./components/NewRunDialog";
import { useWorkflowDefinition } from "./hooks/useWorkflowDefinition";
import { useWorkflowRuns } from "./hooks/useWorkflowRuns";
import { useWorkflowWebSocket } from "./hooks/useWorkflowWebSocket";
import { getPhaseId, getPhaseLabel } from "@/shared/utils/phase.utils";

export function WorkflowDefinitionView() {
  const { projectId, definitionId } = useParams<{
    projectId: string;
    definitionId: string;
  }>();
  const navigate = useNavigate();

  const {
    data: definition,
    isLoading: definitionLoading,
    isError: definitionError,
  } = useWorkflowDefinition(definitionId);

  // Redirect to workflows list if definition not found
  useEffect(() => {
    if (definitionError || (!definitionLoading && !definition)) {
      navigate(`/projects/${projectId}/workflows`, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [definitionError, definitionLoading, definition, projectId]);

  // Fetch all runs for this workflow definition
  const { data: allExecutions, isLoading: runsLoading } = useWorkflowRuns(
    projectId!,
    { definitionId }
  );

  useWorkflowWebSocket(projectId!);

  // Dialog state
  const [showNewRunDialog, setShowNewRunDialog] = useState(false);

  const isLoading = definitionLoading || runsLoading || !definition;

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  // Get phases from workflow definition
  const phases = definition?.phases || [];

  // Group runs by current phase
  const runsByPhase = (allExecutions || []).reduce(
    (acc, exec) => {
      const phase = exec.current_phase || "Not Started";
      if (!acc[phase]) {
        acc[phase] = [];
      }
      acc[phase].push(exec);
      return acc;
    },
    {} as Record<string, any[]>
  );

  const handleExecutionClick = (clickedExecution: any) => {
    // Navigate to run detail view
    navigate(
      `/projects/${projectId}/workflows/${definitionId}/runs/${clickedExecution.id}`
    );
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b bg-background p-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(`/projects/${projectId}/workflows`)}
            className="rounded-md p-2 hover:bg-muted"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{definition?.name}</h1>
              <span className="text-sm text-muted-foreground">
                {(allExecutions || []).length} run
                {(allExecutions || []).length !== 1 ? "s" : ""}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Workflow Definition • {phases.length} phase
              {phases.length !== 1 ? "s" : ""}
            </p>
          </div>

          <button
            onClick={() => setShowNewRunDialog(true)}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            New Run
          </button>
        </div>
      </div>

      {/* Kanban Board - Full Screen */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden p-4">
        <div className="flex gap-4 h-full min-w-full">
          {/* Add "Not Started" column first */}
          {runsByPhase["Not Started"] && (
            <div className="flex-1 min-w-80 h-full">
              <WorkflowPhaseKanbanColumn
                phaseId="not-started"
                phaseLabel="Not Started"
                runs={runsByPhase["Not Started"]}
                onExecutionClick={handleExecutionClick}
              />
            </div>
          )}

          {/* Then add columns for each phase from the definition */}
          {phases.map((phase: any) => {
            const phaseId = getPhaseId(phase);
            const phaseLabel = getPhaseLabel(phase);
            return (
              <div key={phaseId} className="flex-1 min-w-80 h-full">
                <WorkflowPhaseKanbanColumn
                  phaseId={phaseId}
                  phaseLabel={phaseLabel}
                  runs={runsByPhase[phaseId] || []}
                  onExecutionClick={handleExecutionClick}
                />
              </div>
            );
          })}
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
