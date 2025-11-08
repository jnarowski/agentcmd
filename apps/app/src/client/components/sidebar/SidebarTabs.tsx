import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/client/components/ui/tabs";
import { useSettings, useUpdateSettings } from "@/client/hooks/useSettings";
import { NavTasks } from "./nav-tasks";
import { NavActivities } from "./nav-activities";
import { NavProjects } from "./nav-projects";
import { mockTasks, mockActivities } from "./mock-data";

export function SidebarTabs() {
  const { data: settings } = useSettings();
  const updateSettings = useUpdateSettings();

  const activeTab = settings?.userPreferences?.sidebar_active_tab || "activities";

  // Calculate counts
  const tasksCount = mockTasks.length;
  const activitiesCount = mockActivities.filter((a) => !a.workflowRunId).length;
  const projectsCount = 3; // From mock data

  const handleTabChange = (value: string) => {
    updateSettings.mutate({
      sidebar_active_tab: value as "projects" | "activities" | "tasks"
    });
  };

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className="flex-1 flex flex-col">
      <div className="pl-2 pr-2 py-2">
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

      <TabsContent value="projects" className="flex-1 mt-0 overflow-auto">
        <NavProjects />
      </TabsContent>

      <TabsContent value="activities" className="flex-1 mt-0 overflow-auto">
        <NavActivities />
      </TabsContent>

      <TabsContent value="tasks" className="flex-1 mt-0 overflow-auto">
        <NavTasks />
      </TabsContent>
    </Tabs>
  );
}
