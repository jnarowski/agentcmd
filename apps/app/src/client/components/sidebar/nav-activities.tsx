import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueries } from "@tanstack/react-query";
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/client/components/ui/sidebar";
import { Badge } from "@/client/components/ui/badge";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/client/components/ui/toggle-group";
import { useSettings, useUpdateSettings } from "@/client/hooks/useSettings";
import { useProjectsWithSessions } from "@/client/pages/projects/hooks/useProjects";
import { AgentIcon } from "@/client/components/AgentIcon";
import { getSessionDisplayName } from "@/client/utils/getSessionDisplayName";
import { api } from "@/client/utils/api";
import { SessionDropdownMenu } from "@/client/pages/projects/sessions/components/SessionDropdownMenu";
import type { WorkflowRunListItem } from "@/client/pages/projects/workflows/types";
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
  const navigate = useNavigate();
  const { data: settings } = useSettings();
  const updateSettings = useUpdateSettings();
  const { data: projectsData } = useProjectsWithSessions();
  const [hoveredActivityId, setHoveredActivityId] = useState<string | null>(
    null
  );
  const [menuOpenActivityId, setMenuOpenActivityId] = useState<string | null>(
    null
  );

  const filter: ActivityFilter =
    settings?.userPreferences?.activity_filter || "all";

  // Extract sessions from all projects and map to Activity type
  const sessionActivities = useMemo(() => {
    if (!projectsData) return [];

    const activities: Activity[] = [];
    for (const project of projectsData) {
      for (const session of project.sessions) {
        const displayName = getSessionDisplayName(session);
        activities.push({
          id: session.id,
          type: "session",
          name:
            displayName.length > 37
              ? displayName.slice(0, 37) + "..."
              : displayName,
          projectId: project.id,
          projectName:
            project.name.length > 30
              ? project.name.slice(0, 30) + "..."
              : project.name,
          status: session.state,
          createdAt: new Date(session.created_at),
          agent: session.agent,
          session: session,
        });
      }
    }
    return activities;
  }, [projectsData]);

  // Fetch workflow runs for all projects using useQueries
  const workflowQueries = useQueries({
    queries: (projectsData || []).map((project) => ({
      queryKey: ["workflow-runs", project.id],
      queryFn: async () => {
        const params = new URLSearchParams();
        params.append("project_id", project.id);
        const response = await api.get<{ data: WorkflowRunListItem[] }>(
          `/api/workflow-runs?${params.toString()}`
        );
        return response.data;
      },
      enabled: !!project.id,
    })),
  });

  // Map workflow runs to Activity type
  const workflowActivities = useMemo(() => {
    if (!projectsData) return [];

    const activities: Activity[] = [];
    workflowQueries.forEach((query, index) => {
      if (!query.data) return;

      const project = projectsData[index];
      for (const run of query.data) {
        activities.push({
          id: run.id,
          type: "workflow",
          name: run.name.length > 50 ? run.name.slice(0, 50) + "..." : run.name,
          projectId: project.id,
          projectName:
            project.name.length > 30
              ? project.name.slice(0, 30) + "..."
              : project.name,
          status: run.status,
          createdAt: new Date(run.created_at),
        });
      }
    });
    return activities;
  }, [projectsData, workflowQueries]);

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

  const handleActivityClick = (activity: Activity) => {
    if (activity.type === "session") {
      navigate(`/projects/${activity.projectId}/sessions/${activity.id}`);
    } else {
      navigate(`/projects/${activity.projectId}/workflows/${activity.id}`);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "running":
        return "bg-blue-500/10 text-blue-500 hover:bg-blue-500/20";
      case "completed":
        return "bg-green-500/10 text-green-500 hover:bg-green-500/20";
      case "failed":
        return "bg-red-500/10 text-red-500 hover:bg-red-500/20";
      default:
        return "bg-gray-500/10 text-gray-500 hover:bg-gray-500/20";
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-2 pb-2 shrink-0">
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
      </div>
      <div className="flex-1 overflow-y-auto px-2">
        {filteredActivities.length === 0 ? (
          <div className="py-4 text-center text-sm text-muted-foreground">
            No recent activity
          </div>
        ) : (
          <SidebarMenu>
            {filteredActivities.map((activity) => (
              <SidebarMenuItem
                key={activity.id}
                onMouseEnter={() => setHoveredActivityId(activity.id)}
                onMouseLeave={() => setHoveredActivityId(null)}
                className="relative"
              >
                <SidebarMenuButton
                  onClick={() => handleActivityClick(activity)}
                  className="h-auto min-h-[28px] px-2 py-1"
                >
                  {activity.type === "session" && activity.agent && (
                    <AgentIcon
                      agent={activity.agent}
                      className="size-4 shrink-0"
                    />
                  )}
                  <div className="flex flex-1 flex-col gap-0.5 min-w-0">
                    <span className="text-sm min-w-0">{activity.name}</span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {activity.type === "session" && (
                        <Badge
                          variant="secondary"
                          className={`h-4 px-1.5 text-[10px] w-12 shrink-0 justify-center ${getStatusColor(activity.status)}`}
                        >
                          {activity.status}
                        </Badge>
                      )}
                      <Badge
                        variant="secondary"
                        className="h-4 px-1.5 text-[10px] bg-muted/50 text-muted-foreground hover:bg-muted/50 truncate"
                      >
                        {activity.projectName}
                      </Badge>
                    </div>
                  </div>
                </SidebarMenuButton>
                {activity.type === "session" &&
                  activity.session &&
                  (hoveredActivityId === activity.id ||
                    menuOpenActivityId === activity.id) && (
                    <div className="absolute right-2 top-2 z-50">
                      <SessionDropdownMenu
                        session={activity.session}
                        onMenuOpenChange={(open) =>
                          setMenuOpenActivityId(open ? activity.id : null)
                        }
                        triggerClassName="data-[state=open]:bg-accent"
                      />
                    </div>
                  )}
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        )}
      </div>
    </div>
  );
}
