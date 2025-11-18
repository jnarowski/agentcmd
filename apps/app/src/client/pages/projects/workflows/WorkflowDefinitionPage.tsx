/* eslint-disable @typescript-eslint/no-explicit-any */
import { useParams, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { ArrowLeft, Plus } from "lucide-react";
import { WorkflowPhaseKanbanColumn } from "./components/WorkflowPhaseKanbanColumn";
import { useWorkflowDefinition } from "./hooks/useWorkflowDefinition";
import { useWorkflowRuns } from "./hooks/useWorkflowRuns";
import { useWorkflowWebSocket } from "./hooks/useWorkflowWebSocket";
import { getPhaseId, getPhaseLabel } from "@/shared/utils/phase.utils";

function WorkflowDefinitionPage() {
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
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold truncate">
                {definition?.name}
              </h1>
              <span className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">
                {(allExecutions || []).length} run
                {(allExecutions || []).length !== 1 ? "s" : ""}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1 truncate">
              Workflow Definition • {phases.length} phase
              {phases.length !== 1 ? "s" : ""}
            </p>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0 w-full sm:w-auto">
            <button
              onClick={() => navigate(`/projects/${projectId}/workflows`)}
              className="hidden sm:flex rounded-md p-2 hover:bg-muted"
              aria-label="Back to workflows"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>

            <button
              onClick={() =>
                navigate(`/projects/${projectId}/workflows/${definitionId}/new`)
              }
              className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-primary-foreground hover:bg-primary/90 w-full sm:w-auto"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">New Run</span>
              <span className="sm:hidden">New Run</span>
            </button>
          </div>
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
    </div>
  );
}

export default WorkflowDefinitionPage;
