import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/client/components/ui/toggle-group";
import { Badge } from "@/client/components/ui/badge";
import { AgentIcon } from "@/client/components/AgentIcon";
import { SessionStateBadge } from "@/client/pages/projects/sessions/components/SessionStateBadge";
import { getSessionDisplayName } from "@/client/utils/getSessionDisplayName";
import { getWorkflowStatusConfig } from "@/client/pages/projects/workflows/utils/workflowStatus";
import { useProjects } from "@/client/pages/projects/hooks/useProjects";
import { useSessionList } from "@/client/hooks/useSessionList";
import { useAllWorkflowRuns } from "@/client/pages/projects/workflows/hooks/useAllWorkflowRuns";
import type { AgentType } from "@/shared/types/agent.types";
import type { SessionSummary } from "@/client/pages/projects/sessions/stores/sessionStore";
import type { WorkflowStatus } from "@/shared/schemas/workflow.schemas";
import { format } from "date-fns";

type ActivityFilter = "all" | "sessions" | "workflows";

interface Activity {
  id: string;
  type: "session" | "workflow";
  name: string;
  projectId: string;
  projectName: string;
  status: string | WorkflowStatus;
  createdAt: Date;
  agent?: AgentType;
  session?: SessionSummary;
  workflowDefinitionId?: string;
}

interface ProjectHomeActivitiesProps {
  projectId: string;
}

/**
 * Activities tab content for project home page
 * Shows combined Sessions + Workflow runs in table format
 * Filter is local state (not persisted)
 */
export function ProjectHomeActivities({
  projectId,
}: ProjectHomeActivitiesProps) {
  const navigate = useNavigate();
  const { data: projects } = useProjects();
  const [filter, setFilter] = useState<ActivityFilter>("all");

  // Fetch sessions for this project
  const { sessions } = useSessionList(projectId, {
    limit: 20,
    orderBy: "created_at",
    order: "desc",
  });

  // Fetch active/in-progress workflow runs for this project
  const { data: allWorkflowRuns } = useAllWorkflowRuns(
    ["pending", "running", "failed"],
    projectId
  );

  // Map sessions to Activity type
  const sessionActivities = useMemo(() => {
    if (!sessions) return [];

    const activities: Activity[] = [];
    for (const session of sessions) {
      const project = projects?.find((p) => p.id === session.projectId);
      const projectName = project?.name ?? session.projectId;

      activities.push({
        id: session.id,
        type: "session",
        name: "",
        projectId: session.projectId,
        projectName:
          projectName && projectName.length > 30
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

  // Map workflow runs to Activity type
  const workflowActivities = useMemo(() => {
    if (!allWorkflowRuns) return [];

    const activities: Activity[] = [];
    for (const run of allWorkflowRuns) {
      const project = projects?.find((p) => p.id === run.project_id);
      const projectName = project?.name ?? run.project_id;

      activities.push({
        id: run.id,
        type: "workflow",
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

  // Merge, filter, and sort activities
  let filteredActivities = [...sessionActivities, ...workflowActivities];

  if (filter === "sessions") {
    filteredActivities = filteredActivities.filter((a) => a.type === "session");
  } else if (filter === "workflows") {
    filteredActivities = filteredActivities.filter(
      (a) => a.type === "workflow"
    );
  }

  // Sort by created_at descending (newest first) and limit to 50
  filteredActivities.sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
  );
  filteredActivities = filteredActivities.slice(0, 50);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <ToggleGroup
          type="single"
          value={filter}
          onValueChange={(value) => {
            if (value) {
              setFilter(value as ActivityFilter);
            }
          }}
          className="justify-start gap-1"
        >
          <ToggleGroupItem
            value="all"
            aria-label="Show all"
            className="h-8 px-3 text-sm"
          >
            All
          </ToggleGroupItem>
          <ToggleGroupItem
            value="sessions"
            aria-label="Show sessions only"
            className="h-8 px-3 text-sm"
          >
            Sessions
          </ToggleGroupItem>
          <ToggleGroupItem
            value="workflows"
            aria-label="Show workflows only"
            className="h-8 px-3 text-sm"
          >
            Workflows
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {filteredActivities.length === 0 ? (
        <div className="py-8 text-center text-sm text-muted-foreground">
          No recent activity
        </div>
      ) : (
        <div className="border rounded-md">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left p-2 text-xs font-medium text-muted-foreground">
                  Type
                </th>
                <th className="text-left p-2 text-xs font-medium text-muted-foreground">
                  Name
                </th>
                <th className="text-left p-2 text-xs font-medium text-muted-foreground">
                  Status
                </th>
                <th className="text-left p-2 text-xs font-medium text-muted-foreground">
                  Created
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredActivities.map((activity) => {
                if (activity.type === "session" && activity.session) {
                  const displayName = getSessionDisplayName(activity.session);
                  const timeAgo = format(
                    new Date(activity.session.created_at),
                    "MM/dd 'at' h:mma"
                  );

                  return (
                    <tr
                      key={activity.id}
                      className="border-b last:border-b-0 hover:bg-accent/50 cursor-pointer"
                      onClick={() =>
                        navigate(
                          `/projects/${activity.projectId}/sessions/${activity.id}`
                        )
                      }
                    >
                      <td className="p-2">
                        <div className="flex items-center gap-2">
                          {activity.agent && (
                            <AgentIcon
                              agent={activity.agent}
                              className="size-4"
                            />
                          )}
                          <span className="text-xs text-muted-foreground">
                            Session
                          </span>
                        </div>
                      </td>
                      <td className="p-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium truncate">
                            {displayName}
                          </span>
                          {activity.session.permission_mode === "plan" && (
                            <Badge
                              variant="secondary"
                              className="text-xs px-1.5 py-0 h-4 bg-green-500/10 text-green-600 border-green-500/20"
                            >
                              Plan
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="p-2">
                        <SessionStateBadge
                          state={activity.session.state}
                          errorMessage={activity.session.error_message}
                          compact
                        />
                      </td>
                      <td className="p-2 text-xs text-muted-foreground tabular-nums">
                        {timeAgo}
                      </td>
                    </tr>
                  );
                } else if (activity.type === "workflow") {
                  const statusConfig = getWorkflowStatusConfig(
                    activity.status as WorkflowStatus
                  );
                  const StatusIcon = statusConfig.icon;

                  return (
                    <tr
                      key={activity.id}
                      className="border-b last:border-b-0 hover:bg-accent/50 cursor-pointer"
                      onClick={() =>
                        navigate(
                          `/projects/${activity.projectId}/workflows/${activity.workflowDefinitionId}/runs/${activity.id}`
                        )
                      }
                    >
                      <td className="p-2">
                        <div className="flex items-center gap-2">
                          <StatusIcon
                            className={`size-4 ${statusConfig.textColor} ${activity.status === "running" ? "animate-spin" : ""}`}
                          />
                          <span className="text-xs text-muted-foreground">
                            Workflow
                          </span>
                        </div>
                      </td>
                      <td className="p-2">
                        <span className="text-sm font-medium truncate">
                          {activity.name}
                        </span>
                      </td>
                      <td className="p-2">
                        <Badge
                          variant="secondary"
                          className={`text-xs px-1.5 py-0 h-4 ${
                            activity.status === "running"
                              ? "bg-blue-500/10 text-blue-500"
                              : activity.status === "completed"
                                ? "bg-green-500/10 text-green-500"
                                : activity.status === "failed"
                                  ? "bg-red-500/10 text-red-500"
                                  : "bg-gray-500/10 text-gray-500"
                          }`}
                        >
                          {activity.status}
                        </Badge>
                      </td>
                      <td className="p-2 text-xs text-muted-foreground tabular-nums">
                        {format(
                          new Date(activity.createdAt),
                          "MM/dd 'at' h:mma"
                        )}
                      </td>
                    </tr>
                  );
                }
                return null;
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
