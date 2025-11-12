import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { Filter, X } from "lucide-react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/client/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/client/components/ui/tooltip";
import { useSettings, useUpdateSettings } from "@/client/hooks/useSettings";
import { useProjects } from "@/client/pages/projects/hooks/useProjects";
import { useSessions } from "@/client/pages/projects/sessions/hooks/useAgentSessions";
import { useAllWorkflowRuns } from "@/client/pages/projects/workflows/hooks/useAllWorkflowRuns";
import { useNavigationStore } from "@/client/stores/navigationStore";
import { NavTasks } from "./NavTasks";
import { NavActivities } from "./NavActivities";
import { NavProjects } from "./NavProjects";
import { useTasks } from "@/client/hooks/useTasks";

export function SidebarTabs() {
  const { data: settings } = useSettings();
  const updateSettings = useUpdateSettings();
  const { data: projects } = useProjects();
  const { activeSessionId, activeProjectId } = useNavigationStore();
  const { runId } = useParams();

  const activeTab =
    settings?.userPreferences?.sidebar_active_tab || "activities";
  const view = settings?.userPreferences?.projects_view || "all";

  // Get project filter: only use if explicitly set
  const projectFilter =
    settings?.userPreferences?.active_project_filter || undefined;

  // Fetch filtered data for counts
  const { data: sessions } = useSessions({
    projectId: projectFilter || undefined,
    limit: 100,
    orderBy: "created_at",
    order: "desc",
  });
  const { data: allWorkflowRuns } = useAllWorkflowRuns(
    ["pending", "running", "failed"],
    projectFilter
  );

  const isFiltered =
    settings?.userPreferences?.active_project_filter &&
    settings.userPreferences.active_project_filter !== null;

  const handleToggleFilter = () => {
    if (isFiltered) {
      updateSettings.mutate({ active_project_filter: null });
    } else if (activeProjectId) {
      updateSettings.mutate({ active_project_filter: activeProjectId });
    }
  };

  // Auto-switch to Activities tab when entering session or workflow run
  // (Comment out this useEffect to disable auto-switching behavior)
  useEffect(() => {
    if (activeSessionId || runId) {
      updateSettings.mutate({ sidebar_active_tab: "activities" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSessionId, runId]);

  // Clear filter when no active project
  useEffect(() => {
    if (!activeProjectId && isFiltered) {
      updateSettings.mutate({ active_project_filter: null });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeProjectId, isFiltered]);

  // Count sessions and workflows for activities
  const sessionCount = sessions?.length || 0;
  const workflowCount = allWorkflowRuns?.length || 0;
  const activitiesCount = sessionCount + workflowCount;

  // Count projects based on current view
  let projectsCount = 0;
  if (projects) {
    if (view === "favorites") {
      projectsCount = projects.filter(
        (p) => p.is_starred && !p.is_hidden
      ).length;
    } else if (view === "hidden") {
      projectsCount = projects.filter((p) => p.is_hidden).length;
    } else {
      projectsCount = projects.filter((p) => !p.is_hidden).length;
    }
  }

  // Count tasks (specs + planning sessions) filtered by project
  const { data: tasksData } = useTasks(projectFilter);
  const tasksCount =
    (tasksData?.tasks.length || 0) + (tasksData?.planningSessions.length || 0);

  const handleTabChange = (value: string) => {
    updateSettings.mutate({
      sidebar_active_tab: value as "projects" | "activities" | "tasks",
    });
  };

  return (
    <Tabs
      value={activeTab}
      onValueChange={handleTabChange}
      className="flex-1 flex flex-col min-h-0 overflow-hidden"
    >
      <div className="pl-2 pr-2 pt-3 shrink-0 space-y-2">
        <TabsList className="w-full grid grid-cols-3 h-7 p-0.5">
          <TabsTrigger value="projects" className="text-xs h-full px-1.5">
            Projects ({projectsCount})
          </TabsTrigger>
          <TabsTrigger value="activities" className="text-xs h-full px-1.5">
            Activities ({activitiesCount})
          </TabsTrigger>
          <TabsTrigger value="tasks" className="text-xs h-full px-1.5">
            Tasks ({tasksCount})
          </TabsTrigger>
        </TabsList>
        {activeProjectId && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={handleToggleFilter}
                className={`flex items-center gap-2 w-full rounded-md px-1 py-1 transition-colors ${
                  isFiltered
                    ? "bg-primary/10 hover:bg-primary/15"
                    : "hover:bg-muted"
                }`}
              >
                <div
                  className={`shrink-0 h-5 w-5 rounded flex items-center justify-center ${
                    isFiltered
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground"
                  }`}
                >
                  <Filter className="h-3 w-3" />
                </div>
                <span className="text-xs text-muted-foreground text-left">
                  {isFiltered
                    ? "Filtered to current project"
                    : "Filter by project"}
                </span>
                {isFiltered && (
                  <X className="h-3 w-3 text-muted-foreground shrink-0 ml-auto" />
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" sideOffset={8}>
              {isFiltered
                ? "Click to show all projects"
                : "Click to filter by current project"}
            </TooltipContent>
          </Tooltip>
        )}
      </div>

      <TabsContent value="projects" className="flex-1 mt-0 overflow-hidden">
        <NavProjects />
      </TabsContent>

      <TabsContent value="activities" className="flex-1 mt-0 overflow-hidden">
        <NavActivities />
      </TabsContent>

      <TabsContent value="tasks" className="flex-1 mt-0 overflow-hidden">
        <NavTasks />
      </TabsContent>
    </Tabs>
  );
}
