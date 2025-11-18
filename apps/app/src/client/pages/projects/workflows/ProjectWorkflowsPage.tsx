/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { Plus, Search, Settings } from "lucide-react";
import { Button } from "@/client/components/ui/button";
import { WorkflowStatusValues } from "@/shared/schemas/workflow.schemas";
import type { WorkflowStatus } from "@/shared/schemas/workflow.schemas";
import { WorkflowKanbanColumn } from "./components/WorkflowKanbanColumn";
import { useWorkflowRuns } from "./hooks/useWorkflowRuns";
import { useWorkflowDefinitions } from "./hooks/useWorkflowDefinitions";
import { useWorkflowWebSocket } from "./hooks/useWorkflowWebSocket";
import { useProject } from "@/client/pages/projects/hooks/useProjects";
import { Combobox } from "@/client/components/ui/combobox";
import type { ComboboxOption } from "@/client/components/ui/combobox";

export interface ProjectWorkflowsViewProps {
  projectId?: string;
}

function ProjectWorkflowsPage({
  projectId: propProjectId,
}: ProjectWorkflowsViewProps) {
  const { projectId: paramProjectId } = useParams<{ projectId: string }>();
  const projectId = propProjectId || paramProjectId!;
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
      const isPackageInstalled = project.capabilities?.workflow_sdk?.installed ?? false;
      const hasDefinitions = definitions && definitions.length > 0;

      if (!isPackageInstalled || !hasDefinitions) {
        navigate(`/projects/${projectId}/workflows/onboarding`, { replace: true });
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
    navigate(
      `/projects/${projectId}/workflows/${definitionId}/runs/${runId}`
    );
  };

  // Prepare combobox options for workflow definitions
  const workflowOptions: ComboboxOption[] =
    definitions?.map((def) => ({
      value: def.id,
      label: def.name,
      description: def.load_error || def.description || undefined,
      badge: def.load_error ? 'ERROR' : `${def.phases?.length || 0} phases`,
    })) || [];

  const handleWorkflowSelect = (value: string) => {
    if (value) {
      navigate(`/projects/${projectId}/workflows/${value}`);
    }
  };

  const handleNewRunClick = () => {
    // Check if onboarding is needed
    const isPackageInstalled = project?.capabilities?.workflow_sdk?.installed ?? false;
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
      {/* Header */}
      <div className="border-b bg-background px-4 py-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-4">
          <h1 className="text-xl md:text-2xl font-bold">Workflows</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={handleNewRunClick}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              New Run
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="mt-4 flex flex-col md:flex-row md:items-stretch gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search workflows..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-full rounded-md border bg-background py-2 pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="flex gap-2 md:flex-1">
            <div className="flex-1">
              <Combobox
                options={workflowOptions}
                onValueChange={handleWorkflowSelect}
                placeholder="Select Workflow"
                searchPlaceholder="Search workflows..."
              />
            </div>
            <Link to={`/projects/${projectId}/workflows/manage`}>
              <Button variant="outline" className="h-9">
                <Settings className="h-4 w-4 md:mr-2" />
                <span className="hidden md:inline">Manage</span>
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto">
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : (
          <div className="flex gap-4 h-full md:min-w-0 min-w-max px-4 py-4">
            {[
              WorkflowStatusValues.PENDING,
              WorkflowStatusValues.RUNNING,
              WorkflowStatusValues.COMPLETED,
              WorkflowStatusValues.FAILED,
            ].map((status) => (
              <div key={status} className="w-72 md:flex-1 md:min-w-0">
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
