import { useNavigate } from "react-router-dom";
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/client/components/ui/sidebar";
import { Badge } from "@/client/components/ui/badge";
import { ToggleGroup, ToggleGroupItem } from "@/client/components/ui/toggle-group";
import { mockActivities } from "./mock-data";
import type { ActivityFilter } from "./types";
import { useSettings, useUpdateSettings } from "@/client/hooks/useSettings";

export function NavActivities() {
  const navigate = useNavigate();
  const { data: settings } = useSettings();
  const updateSettings = useUpdateSettings();

  const filter: ActivityFilter = settings?.userPreferences?.activity_filter || "all";

  // Show all activities from all projects (global sidebar), hide workflow-attached sessions
  let filteredActivities = mockActivities.filter((a) => !a.workflowRunId);

  if (filter === "sessions") {
    filteredActivities = filteredActivities.filter((a) => a.type === "session");
  } else if (filter === "workflows") {
    filteredActivities = filteredActivities.filter((a) => a.type === "workflow");
  }

  // Sort by most recent and limit to 10 for tab view
  filteredActivities.sort(
    (a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
  filteredActivities = filteredActivities.slice(0, 10);

  const handleActivityClick = (activity: typeof mockActivities[0]) => {
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
    <div className="px-2 py-2">
      <div className="pb-2">
        <ToggleGroup
          type="single"
          value={filter}
          onValueChange={(value) => {
            if (value) {
              updateSettings.mutate({ activity_filter: value as ActivityFilter });
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
      {filteredActivities.length === 0 ? (
        <div className="py-4 text-center text-sm text-muted-foreground">
          No recent activity
        </div>
      ) : (
        <SidebarMenu>
          {filteredActivities.map((activity) => (
            <SidebarMenuItem key={activity.id}>
              <SidebarMenuButton
                onClick={() => handleActivityClick(activity)}
                className="h-7 px-2"
              >
                <div className="flex flex-1 items-center justify-between gap-2">
                  <span className="truncate text-sm">
                    {activity.name}
                  </span>
                  <Badge
                    variant="secondary"
                    className={`h-4 px-1.5 text-[10px] ${getStatusColor(activity.status)}`}
                  >
                    {activity.status}
                  </Badge>
                </div>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      )}
    </div>
  );
}
