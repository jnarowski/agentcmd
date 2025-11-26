import { useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { RefreshCw, Plus } from "lucide-react";
import {
  SidebarMenu,
  SidebarGroupLabel,
  useSidebar,
} from "@/client/components/ui/sidebar";
import { Button } from "@/client/components/ui/button";
import { useNavigationStore } from "@/client/stores";
import {
  useProjects,
  useSyncProjectsMutation,
} from "@/client/pages/projects/hooks/useProjects";
import { workflowKeys } from "@/client/pages/projects/workflows/hooks/queryKeys";
import { useAllWorkflowRuns } from "@/client/pages/projects/workflows/hooks/useAllWorkflowRuns";
import { WorkflowItem } from "@/client/components/sidebar/WorkflowItem";
import type { WorkflowStatus } from "@/shared/schemas/workflow.schemas";

interface WorkflowActivity {
  id: string;
  name: string;
  projectId: string;
  projectName: string;
  status: WorkflowStatus;
  createdAt: Date;
  workflowDefinitionId: string;
}

export function NavWorkflows() {
  const navigate = useNavigate();
  const activeProjectId = useNavigationStore((s) => s.activeProjectId);
  const { data: projects } = useProjects();
  const queryClient = useQueryClient();
  const syncProjectsMutation = useSyncProjectsMutation();
  const { isMobile, setOpenMobile } = useSidebar();

  // Fetch all workflow statuses for grouping
  const { data: allWorkflowRuns } = useAllWorkflowRuns(
    ["pending", "running", "paused", "completed", "failed", "cancelled"],
    activeProjectId
  );

  // Map workflow runs to Activity type (client-side join with projects)
  const workflowActivities = useMemo(() => {
    if (!allWorkflowRuns) return [];

    const activities: WorkflowActivity[] = [];
    for (const run of allWorkflowRuns) {
      const project = projects?.find((p) => p.id === run.project_id);

      const projectName = project?.name ?? run.project_id;
      activities.push({
        id: run.id,
        name: run.name.length > 50 ? run.name.slice(0, 50) + "..." : run.name,
        projectId: run.project_id,
        projectName:
          projectName && projectName.length > 30
            ? projectName.slice(0, 30) + "..."
            : projectName,
        status: run.status,
        createdAt: new Date(run.created_at),
        workflowDefinitionId: run.workflow_definition_id,
      });
    }
    return activities;
  }, [allWorkflowRuns, projects]);

  // Group workflows into Running, Completed, and Failed
  const { runningWorkflows, completedWorkflows, failedWorkflows } =
    useMemo(() => {
      const running: WorkflowActivity[] = [];
      const completed: WorkflowActivity[] = [];
      const failed: WorkflowActivity[] = [];

      for (const workflow of workflowActivities) {
        // Running: pending, running, paused
        if (
          workflow.status === "pending" ||
          workflow.status === "running" ||
          workflow.status === "paused"
        ) {
          running.push(workflow);
        }
        // Completed
        else if (workflow.status === "completed") {
          completed.push(workflow);
        }
        // Failed: failed, cancelled
        else if (
          workflow.status === "failed" ||
          workflow.status === "cancelled"
        ) {
          failed.push(workflow);
        }
      }

      // Sort by created date descending
      running.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      completed.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      failed.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      return {
        runningWorkflows: running,
        completedWorkflows: completed.slice(0, 5), // Limit to 5
        failedWorkflows: failed,
      };
    }, [workflowActivities]);

  const handleRefresh = () => {
    syncProjectsMutation.mutate(undefined, {
      onSuccess: () => {
        // Invalidate all workflow runs
        queryClient.invalidateQueries({ queryKey: workflowKeys.allRuns() });
      },
    });
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-2 shrink-0 flex items-center gap-2">
        <SidebarGroupLabel>Running</SidebarGroupLabel>
        {activeProjectId && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              navigate(`/projects/${activeProjectId}/workflows/new`);
              if (isMobile) {
                setOpenMobile(false);
              }
            }}
            className="ml-auto h-8 w-8 md:h-6 md:w-6 p-0 flex items-center justify-center"
            aria-label="Create new workflow"
          >
            <Plus className="size-5 md:size-3.5" />
          </Button>
        )}
        <Button
          size="sm"
          variant="ghost"
          onClick={handleRefresh}
          disabled={syncProjectsMutation.isPending}
          className={`hidden md:flex h-6 w-6 p-0 items-center justify-center ${!activeProjectId ? "ml-auto" : ""}`}
          aria-label="Refresh workflows"
        >
          <RefreshCw
            className={`size-3.5 ${syncProjectsMutation.isPending ? "animate-spin" : ""}`}
          />
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto border-t">
        {runningWorkflows.length === 0 &&
        completedWorkflows.length === 0 &&
        failedWorkflows.length === 0 ? (
          <div className="py-3 px-2 uppercase text-center text-xs text-muted-foreground/50">
            {activeProjectId
              ? "No workflows in this project"
              : "No recent workflows"}
          </div>
        ) : (
          <>
            {/* Running Section */}
            <div className="mb-3">
              {runningWorkflows.length > 0 ? (
                <SidebarMenu className="border-t pt-2 px-2">
                  {runningWorkflows.map((workflow) => (
                    <WorkflowItem
                      key={workflow.id}
                      id={workflow.id}
                      name={workflow.name}
                      projectId={workflow.projectId}
                      projectName={workflow.projectName}
                      status={workflow.status}
                      workflowDefinitionId={workflow.workflowDefinitionId}
                      createdAt={workflow.createdAt}
                    />
                  ))}
                </SidebarMenu>
              ) : (
                <div className="py-3 px-2 uppercase text-center text-xs text-muted-foreground/50">
                  Nothing running
                </div>
              )}
            </div>

            {/* Completed Section */}
            {completedWorkflows.length > 0 && (
              <div className="mb-3">
                <SidebarGroupLabel className="pl-4">
                  Completed
                </SidebarGroupLabel>
                <SidebarMenu className="border-t pt-2 px-2">
                  {completedWorkflows.map((workflow) => (
                    <WorkflowItem
                      key={workflow.id}
                      id={workflow.id}
                      name={workflow.name}
                      projectId={workflow.projectId}
                      projectName={workflow.projectName}
                      status={workflow.status}
                      workflowDefinitionId={workflow.workflowDefinitionId}
                      createdAt={workflow.createdAt}
                    />
                  ))}
                </SidebarMenu>
              </div>
            )}

            {/* Failed Section */}
            {failedWorkflows.length > 0 && (
              <div className="mb-3">
                <SidebarGroupLabel className="pl-4">Failed</SidebarGroupLabel>
                <SidebarMenu className="border-t pt-2 px-2">
                  {failedWorkflows.map((workflow) => (
                    <WorkflowItem
                      key={workflow.id}
                      id={workflow.id}
                      name={workflow.name}
                      projectId={workflow.projectId}
                      projectName={workflow.projectName}
                      status={workflow.status}
                      workflowDefinitionId={workflow.workflowDefinitionId}
                      createdAt={workflow.createdAt}
                    />
                  ))}
                </SidebarMenu>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
