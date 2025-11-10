import { useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { SidebarMenu } from "@/client/components/ui/sidebar";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/client/components/ui/toggle-group";
import { Button } from "@/client/components/ui/button";
import { useSettings, useUpdateSettings } from "@/client/hooks/useSettings";
import { useNavigationStore } from "@/client/stores";
import { useProjects, useSyncProjectsMutation } from "@/client/pages/projects/hooks/useProjects";
import { useSessions } from "@/client/pages/projects/sessions/hooks/useAgentSessions";
import { sessionKeys } from "@/client/pages/projects/sessions/hooks/queryKeys";
import { workflowKeys } from "@/client/pages/projects/workflows/hooks/queryKeys";
import { useAllWorkflowRuns } from "@/client/pages/projects/workflows/hooks/useAllWorkflowRuns";
import { getSessionDisplayName } from "@/client/utils/getSessionDisplayName";
import { SessionItem } from "@/client/components/sidebar/SessionItem";
import { WorkflowItem } from "@/client/components/sidebar/WorkflowItem";
import type { AgentType } from "@/shared/types/agent.types";
import type { SessionResponse } from "@/shared/types";

type ActivityFilter = "all" | "sessions" | "workflows";

interface Activity {
  id: string;
  type: "session" | "workflow";
  name: string;
  projectId: string;
  projectName: string;
  status: string;
  createdAt: Date;
  agent?: AgentType;
  session?: SessionResponse;
}

export function NavActivities() {
  const activeSessionId = useNavigationStore((s) => s.activeSessionId);
  const { data: settings } = useSettings();
  const updateSettings = useUpdateSettings();
  const { data: projects } = useProjects();
  const { data: sessions } = useSessions({ limit: 20, orderBy: 'created_at', order: 'desc' });
  // Fetch only active/in-progress runs from backend
  const { data: allWorkflowRuns } = useAllWorkflowRuns(['pending', 'running', 'failed']);
  const queryClient = useQueryClient();
  const syncProjectsMutation = useSyncProjectsMutation();

  const filter: ActivityFilter =
    settings?.userPreferences?.activity_filter || "all";

  // Map sessions to Activity type, join with project names
  const sessionActivities = useMemo(() => {
    if (!sessions) return [];

    const activities: Activity[] = [];
    for (const session of sessions) {
      const project = projects?.find(p => p.id === session.projectId);

      const displayName = getSessionDisplayName(session);
      const projectName = project?.name ?? session.projectId;
      activities.push({
        id: session.id,
        type: "session",
        name:
          displayName.length > 37
            ? displayName.slice(0, 37) + "..."
            : displayName,
        projectId: session.projectId,
        projectName:
          projectName.length > 30
            ? projectName.slice(0, 30) + "..."
            : projectName,
        status: session.state,
        createdAt: new Date(session.created_at),
        agent: session.agent,
        session: session,
      });
    }
    return activities;
  }, [sessions, projects]);

  // Map workflow runs to Activity type (client-side join with projects)
  const workflowActivities = useMemo(() => {
    if (!allWorkflowRuns) return [];

    const activities: Activity[] = [];
    for (const run of allWorkflowRuns) {
      const project = projects?.find(p => p.id === run.project_id);

      const projectName = project?.name ?? run.project_id;
      activities.push({
        id: run.id,
        type: "workflow",
        name: run.name.length > 50 ? run.name.slice(0, 50) + "..." : run.name,
        projectId: run.project_id,
        projectName:
          projectName.length > 30
            ? projectName.slice(0, 30) + "..."
            : projectName,
        status: run.status,
        createdAt: new Date(run.created_at),
      });
    }
    return activities;
  }, [allWorkflowRuns, projects]);

  // Merge, filter, and sort activities
  let filteredActivities = [...sessionActivities, ...workflowActivities];

  if (filter === "sessions") {
    filteredActivities = filteredActivities.filter((a) => a.type === "session");
  } else if (filter === "workflows") {
    filteredActivities = filteredActivities.filter(
      (a) => a.type === "workflow"
    );
  }

  // Sort by created_at descending (newest first) and limit to 10
  filteredActivities.sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
  );
  filteredActivities = filteredActivities.slice(0, 10);

  const handleRefresh = () => {
    syncProjectsMutation.mutate(undefined, {
      onSuccess: () => {
        // Invalidate sessions lists
        queryClient.invalidateQueries({ queryKey: sessionKeys.lists() });

        // Invalidate all workflow runs
        queryClient.invalidateQueries({ queryKey: workflowKeys.allRuns() });
      },
    });
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-2 pb-2 shrink-0 flex items-center gap-1">
        <ToggleGroup
          type="single"
          value={filter}
          onValueChange={(value) => {
            if (value) {
              updateSettings.mutate({
                activity_filter: value as ActivityFilter,
              });
            }
          }}
          className="justify-start gap-0.5"
        >
          <ToggleGroupItem
            value="all"
            aria-label="Show all"
            className="h-6 px-2 text-xs"
          >
            All
          </ToggleGroupItem>
          <ToggleGroupItem
            value="sessions"
            aria-label="Show sessions only"
            className="h-6 px-2 text-xs"
          >
            Sessions
          </ToggleGroupItem>
          <ToggleGroupItem
            value="workflows"
            aria-label="Show workflows only"
            className="h-6 px-2 text-xs"
          >
            Workflows
          </ToggleGroupItem>
        </ToggleGroup>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleRefresh}
          disabled={syncProjectsMutation.isPending}
          className="ml-auto h-6 w-6 p-0"
          aria-label="Refresh activities"
        >
          <RefreshCw className={`size-3.5 ${syncProjectsMutation.isPending ? "animate-spin" : ""}`} />
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto px-2">
        {filteredActivities.length === 0 ? (
          <div className="py-4 text-center text-sm text-muted-foreground">
            No recent activity
          </div>
        ) : (
          <SidebarMenu>
            {filteredActivities.map((activity) => {
              if (activity.type === "session" && activity.session) {
                return (
                  <SessionItem
                    key={activity.id}
                    id={activity.id}
                    name={activity.name}
                    projectId={activity.projectId}
                    projectName={activity.projectName}
                    status={activity.status}
                    agent={activity.agent}
                    session={activity.session}
                    isActive={activity.id === activeSessionId}
                  />
                );
              } else if (activity.type === "workflow") {
                return (
                  <WorkflowItem
                    key={activity.id}
                    id={activity.id}
                    name={activity.name}
                    projectId={activity.projectId}
                    projectName={activity.projectName}
                    status={activity.status}
                  />
                );
              }
              return null;
            })}
          </SidebarMenu>
        )}
      </div>
    </div>
  );
}
