/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { Plus, Search, Settings, LayoutGrid } from "lucide-react";
import { Button } from "@/client/components/ui/button";
import { WorkflowStatusValues } from "@/shared/schemas/workflow.schemas";
import type { WorkflowStatus } from "@/shared/schemas/workflow.schemas";
import { WorkflowAccordionSection } from "./components/WorkflowAccordionSection";
import { WorkflowRunCard } from "./components/WorkflowRunCard";
import { useWorkflowRuns } from "./hooks/useWorkflowRuns";
import { useWorkflowDefinitions } from "./hooks/useWorkflowDefinitions";
import { useWorkflowWebSocket } from "./hooks/useWorkflowWebSocket";
import { useProject } from "@/client/pages/projects/hooks/useProjects";
import { Combobox } from "@/client/components/ui/combobox";
import type { ComboboxOption } from "@/client/components/ui/combobox";
import { getWorkflowStatusConfig } from "./utils/workflowStatus";
import { PageHeader } from "@/client/components/PageHeader";

export interface ProjectWorkflowsListViewProps {
  projectId?: string;
}

function ProjectWorkflowsListPage({
  projectId: propProjectId,
}: ProjectWorkflowsListViewProps) {
  const { projectId: paramProjectId } = useParams<{ projectId: string }>();
  const projectId = propProjectId || paramProjectId!;
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  // Hooks
  const { data: runs, isLoading } = useWorkflowRuns(projectId, {
    search,
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

  // Limit completed to 20
  const completedRuns = runsByStatus[WorkflowStatusValues.COMPLETED] || [];
  const limitedCompletedRuns = completedRuns.slice(0, 20);

  if (isLoading) {
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
          { label: "Workflows" },
        ]}
        title="Workflows"
        description="View and manage workflow runs organized by status"
        actions={
          <>
            <Link to={`/projects/${projectId}/workflows`}>
              <Button variant="outline" size="sm">
                <LayoutGrid className="h-4 w-4 mr-2" />
                Kanban View
              </Button>
            </Link>
            <button
              onClick={handleNewRunClick}
              className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              New Run
            </button>
          </>
        }
        belowHeader={
          <div className="flex items-stretch gap-2">
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
                <Settings className="h-4 w-4 mr-2" />
                Manage
              </Button>
            </Link>
          </div>
        }
      />

      {/* Accordion Sections */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-5xl mx-auto space-y-4">
          {/* Running */}
          <WorkflowAccordionSection
            title="Running"
            count={runsByStatus[WorkflowStatusValues.RUNNING]?.length || 0}
            defaultOpen={true}
            hideIfEmpty={false}
            icon={getWorkflowStatusConfig(WorkflowStatusValues.RUNNING).icon}
            iconClassName={getWorkflowStatusConfig(WorkflowStatusValues.RUNNING).textColor}
          >
            {(runsByStatus[WorkflowStatusValues.RUNNING] || []).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-4 text-center">
                <p className="text-xs text-muted-foreground">
                  No workflows currently running
                </p>
              </div>
            ) : (
              (runsByStatus[WorkflowStatusValues.RUNNING] || []).map((run) => (
                <WorkflowRunCard
                  key={run.id}
                  run={run}
                  onClick={() => handleExecutionClick(run)}
                />
              ))
            )}
          </WorkflowAccordionSection>

          {/* Failed */}
          <WorkflowAccordionSection
            title="Failed"
            count={runsByStatus[WorkflowStatusValues.FAILED]?.length || 0}
            defaultOpen={true}
            hideIfEmpty={false}
            icon={getWorkflowStatusConfig(WorkflowStatusValues.FAILED).icon}
            iconClassName={getWorkflowStatusConfig(WorkflowStatusValues.FAILED).textColor}
          >
            {(runsByStatus[WorkflowStatusValues.FAILED] || []).map((run) => (
              <WorkflowRunCard
                key={run.id}
                run={run}
                onClick={() => handleExecutionClick(run)}
              />
            ))}
          </WorkflowAccordionSection>

          {/* Pending */}
          <WorkflowAccordionSection
            title="Pending"
            count={runsByStatus[WorkflowStatusValues.PENDING]?.length || 0}
            defaultOpen={false}
            hideIfEmpty={true}
            icon={getWorkflowStatusConfig(WorkflowStatusValues.PENDING).icon}
            iconClassName={getWorkflowStatusConfig(WorkflowStatusValues.PENDING).textColor}
          >
            {(runsByStatus[WorkflowStatusValues.PENDING] || []).map((run) => (
              <WorkflowRunCard
                key={run.id}
                run={run}
                onClick={() => handleExecutionClick(run)}
              />
            ))}
          </WorkflowAccordionSection>

          {/* Completed */}
          <WorkflowAccordionSection
            title="Completed"
            count={completedRuns.length}
            defaultOpen={false}
            hideIfEmpty={false}
            icon={getWorkflowStatusConfig(WorkflowStatusValues.COMPLETED).icon}
            iconClassName={getWorkflowStatusConfig(WorkflowStatusValues.COMPLETED).textColor}
          >
            {limitedCompletedRuns.map((run) => (
              <WorkflowRunCard
                key={run.id}
                run={run}
                onClick={() => handleExecutionClick(run)}
              />
            ))}
            {completedRuns.length > 20 && (
              <div className="text-center py-2">
                <span className="text-sm text-muted-foreground">
                  Showing 20 of {completedRuns.length} completed runs
                </span>
              </div>
            )}
          </WorkflowAccordionSection>

          {/* Paused */}
          <WorkflowAccordionSection
            title="Paused"
            count={runsByStatus[WorkflowStatusValues.PAUSED]?.length || 0}
            defaultOpen={false}
            hideIfEmpty={true}
            icon={getWorkflowStatusConfig(WorkflowStatusValues.PAUSED).icon}
            iconClassName={getWorkflowStatusConfig(WorkflowStatusValues.PAUSED).textColor}
          >
            {(runsByStatus[WorkflowStatusValues.PAUSED] || []).map((run) => (
              <WorkflowRunCard
                key={run.id}
                run={run}
                onClick={() => handleExecutionClick(run)}
              />
            ))}
          </WorkflowAccordionSection>
        </div>
      </div>
    </div>
  );
}

export default ProjectWorkflowsListPage;
