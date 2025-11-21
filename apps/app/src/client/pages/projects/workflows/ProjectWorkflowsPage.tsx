/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { Button } from "@/client/components/ui/button";
import { WorkflowStatusValues } from "@/shared/schemas/workflow.schemas";
import type { WorkflowStatus } from "@/shared/schemas/workflow.schemas";
import { WorkflowKanbanColumn } from "./components/WorkflowKanbanColumn";
import { useWorkflowRuns } from "./hooks/useWorkflowRuns";
import { useWorkflowDefinitions } from "./hooks/useWorkflowDefinitions";
import { useWorkflowWebSocket } from "./hooks/useWorkflowWebSocket";
import { useProject } from "@/client/pages/projects/hooks/useProjects";
import { useProjectId } from "@/client/hooks/useProjectId";
import { PageHeader } from "@/client/components/PageHeader";
import { WorkflowTabs } from "./components/WorkflowTabs";
import { SearchBar } from "@/client/components/ui/search-bar";

export interface ProjectWorkflowsViewProps {
  projectId?: string;
}

function ProjectWorkflowsPage({
  projectId: propProjectId,
}: ProjectWorkflowsViewProps) {
  const paramProjectId = useProjectId();
  const projectId = propProjectId || paramProjectId;
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);

    return () => clearTimeout(timer);
  }, [search]);

  // Hooks
  const { data: runs, isLoading } = useWorkflowRuns(projectId, {
    search: debouncedSearch,
  });
  const { data: definitions } = useWorkflowDefinitions(projectId);
  const { data: project } = useProject(projectId);
  useWorkflowWebSocket(projectId);

  // Redirect to onboarding if setup not complete
  useEffect(() => {
    if (project && definitions !== undefined) {
      const isPackageInstalled =
        project.capabilities?.workflow_sdk?.installed ?? false;
      const hasDefinitions = definitions && definitions.length > 0;

      if (!isPackageInstalled || !hasDefinitions) {
        navigate(`/projects/${projectId}/workflows/onboarding`, {
          replace: true,
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project, definitions, projectId]);

  // TODO: Wire up workflow control mutations
  // const pauseWorkflow = usePauseWorkflow();
  // const resumeWorkflow = useResumeWorkflow();
  // const cancelWorkflow = useCancelWorkflow();

  const handleExecutionClick = (run: any) => {
    // Navigate to run detail page
    const definitionId = run.workflow_definition_id;
    const runId = run.id;
    navigate(`/projects/${projectId}/workflows/${definitionId}/runs/${runId}`);
  };

  const handleNewRunClick = () => {
    // Check if onboarding is needed
    const isPackageInstalled =
      project?.capabilities?.workflow_sdk?.installed ?? false;
    const hasDefinitions = definitions && definitions.length > 0;

    if (!isPackageInstalled || !hasDefinitions) {
      // Navigate to onboarding page
      navigate(`/projects/${projectId}/workflows/onboarding`);
    } else {
      // Navigate to new run page
      navigate(`/projects/${projectId}/workflows/new`);
    }
  };

  // Group runs by status
  const runsByStatus = (runs || []).reduce(
    (acc, run) => {
      if (!acc[run.status]) {
        acc[run.status] = [];
      }
      acc[run.status].push(run);
      return acc;
    },
    {} as Record<WorkflowStatus, any[]>
  );

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        breadcrumbs={[
          { label: "Project", href: `/projects/${projectId}` },
          { label: "Workflows" },
        ]}
        title="Workflows"
        description="View workflow runs across all workflow definitions"
        actions={
          <Button
            onClick={handleNewRunClick}
            variant="outline"
            className="flex-1 md:flex-none"
          >
            <Plus className="h-4 w-4" />
            New Run
          </Button>
        }
        belowHeader={<WorkflowTabs />}
      />

      {/* Search - Dashboard Filter */}
      {!isLoading && (
        <div className="hidden md:block">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search workflows..."
          />
        </div>
      )}

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto">
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-4 h-full px-4 py-4">
            {[
              WorkflowStatusValues.PENDING,
              WorkflowStatusValues.RUNNING,
              WorkflowStatusValues.COMPLETED,
              WorkflowStatusValues.FAILED,
            ].map((status) => (
              <div key={status} className="w-full lg:flex-1 lg:min-w-0">
                <WorkflowKanbanColumn
                  status={status}
                  runs={runsByStatus[status] || []}
                  onExecutionClick={handleExecutionClick}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default ProjectWorkflowsPage;
