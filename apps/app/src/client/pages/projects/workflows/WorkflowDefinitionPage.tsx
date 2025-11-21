/* eslint-disable @typescript-eslint/no-explicit-any */
import { useParams, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { ArrowLeft, Plus } from "lucide-react";
import { WorkflowPhaseKanbanColumn } from "./components/WorkflowPhaseKanbanColumn";
import { useWorkflowDefinition } from "./hooks/useWorkflowDefinition";
import { useWorkflowRuns } from "./hooks/useWorkflowRuns";
import { useWorkflowWebSocket } from "./hooks/useWorkflowWebSocket";
import { useProjectId } from "@/client/hooks/useProjectId";
import { getPhaseId, getPhaseLabel } from "@/shared/utils/phase.utils";
import { PageHeader } from "@/client/components/PageHeader";
import { Button } from "@/client/components/ui/button";

function WorkflowDefinitionPage() {
  const projectId = useProjectId();
  const { definitionId } = useParams<{ definitionId: string }>();
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
      <PageHeader
        breadcrumbs={[
          { label: "Project", href: `/projects/${projectId}` },
          { label: "Workflows", href: `/projects/${projectId}/workflows` },
          { label: definition?.name || "Loading..." },
        ]}
        title={definition?.name || "Loading..."}
        description={`Workflow Definition • ${phases.length} phase${phases.length !== 1 ? "s" : ""}`}
        afterTitle={
          <span className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">
            {(allExecutions || []).length} run
            {(allExecutions || []).length !== 1 ? "s" : ""}
          </span>
        }
        actions={
          <>
            <button
              onClick={() => navigate(`/projects/${projectId}/workflows`)}
              className="hidden sm:flex rounded-md p-2 hover:bg-muted"
              aria-label="Back to workflows"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <Button
              onClick={() =>
                navigate(`/projects/${projectId}/workflows/${definitionId}/new`)
              }
              variant="outline"
              className="flex-1 md:flex-none"
            >
              <Plus className="h-4 w-4" />
              New Run
            </Button>
          </>
        }
      />

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto">
        <div className="flex flex-col xl:flex-row gap-4 h-full px-4 py-4">
            {/* Add "Not Started" column first */}
            {runsByPhase["Not Started"] && (
              <div className="w-full xl:flex-1 xl:min-w-0">
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
                <div key={phaseId} className="w-full xl:flex-1 xl:min-w-0">
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
