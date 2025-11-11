import { useEffect } from "react";
import { useParams } from "react-router-dom";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/client/components/ui/tabs";
import { useSettings, useUpdateSettings } from "@/client/hooks/useSettings";
import { useProjects } from "@/client/pages/projects/hooks/useProjects";
import { useSessions } from "@/client/pages/projects/sessions/hooks/useAgentSessions";
import { useAllWorkflowRuns } from "@/client/pages/projects/workflows/hooks/useAllWorkflowRuns";
import { useNavigationStore } from "@/client/stores/navigationStore";
// import { NavTasks } from "./NavTasks";
import { NavActivities } from "./NavActivities";
import { NavProjects } from "./NavProjects";

export function SidebarTabs() {
  const { data: settings } = useSettings();
  const updateSettings = useUpdateSettings();
  const { data: projects } = useProjects();
  const { data: sessions } = useSessions();
  const { data: allWorkflowRuns } = useAllWorkflowRuns(['pending', 'running', 'failed']);
  const { activeSessionId } = useNavigationStore();
  const { runId } = useParams();

  const activeTab =
    settings?.userPreferences?.sidebar_active_tab || "activities";
  const view = settings?.userPreferences?.projects_view || "all";

  // Auto-switch to Activities tab when entering session or workflow run
  // (Comment out this useEffect to disable auto-switching behavior)
  useEffect(() => {
    if (activeSessionId || runId) {
      updateSettings.mutate({ sidebar_active_tab: "activities" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSessionId, runId]);

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
      <div className="pl-2 pr-2 pt-3 pb-2 shrink-0">
        <TabsList className="w-full grid grid-cols-2 h-7 p-0.5">
          <TabsTrigger value="projects" className="text-xs h-full px-1.5">
            Projects ({projectsCount})
          </TabsTrigger>
          <TabsTrigger value="activities" className="text-xs h-full px-1.5">
            Activities ({activitiesCount})
          </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="projects" className="flex-1 mt-0 overflow-hidden">
        <NavProjects />
      </TabsContent>

      <TabsContent value="activities" className="flex-1 mt-0 overflow-hidden">
        <NavActivities />
      </TabsContent>
    </Tabs>
  );
}
