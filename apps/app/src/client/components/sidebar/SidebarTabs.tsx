import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/client/components/ui/tabs";
import { useSettings, useUpdateSettings } from "@/client/hooks/useSettings";
import { useProjectsWithSessions } from "@/client/pages/projects/hooks/useProjects";
import { NavTasks } from "./nav-tasks";
import { NavActivities } from "./nav-activities";
import { NavProjects } from "./nav-projects";

export function SidebarTabs() {
  const { data: settings } = useSettings();
  const updateSettings = useUpdateSettings();
  const { data: projectsData } = useProjectsWithSessions();

  const activeTab = settings?.userPreferences?.sidebar_active_tab || "activities";
  const view = settings?.userPreferences?.projects_view || "all";

  // Calculate counts based on real data
  const tasksCount = 0; // TODO: Replace with real task count

  // Count sessions and workflows for activities
  let sessionCount = 0;
  let workflowCount = 0;
  if (projectsData) {
    for (const project of projectsData) {
      sessionCount += project.sessions.length;
    }
  }
  const activitiesCount = Math.min(sessionCount + workflowCount, 10); // Limited to 10

  // Count projects based on current view
  let projectsCount = 0;
  if (projectsData) {
    if (view === "favorites") {
      projectsCount = projectsData.filter((p) => p.is_starred && !p.is_hidden).length;
    } else if (view === "hidden") {
      projectsCount = projectsData.filter((p) => p.is_hidden).length;
    } else {
      projectsCount = projectsData.filter((p) => !p.is_hidden).length;
    }
  }

  const handleTabChange = (value: string) => {
    updateSettings.mutate({
      sidebar_active_tab: value as "projects" | "activities" | "tasks"
    });
  };

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className="flex-1 flex flex-col min-h-0 overflow-hidden">
      <div className="pl-2 pr-2 py-2 shrink-0">
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
