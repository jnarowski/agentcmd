import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/client/components/ui/tabs";
import { useSettings, useUpdateSettings } from "@/client/hooks/useSettings";
import { ProjectHomeActivities } from "@/client/pages/projects/components/ProjectHomeActivities";
import { ProjectHomeTasks } from "@/client/pages/projects/components/ProjectHomeTasks";

interface ProjectHomeContentProps {
  projectId: string;
}

type HomeTab = "activities" | "tasks";

/**
 * Main content component for project home page
 * Provides Activities and Tasks tabs with persisted state
 */
export function ProjectHomeContent({ projectId }: ProjectHomeContentProps) {
  const { data: settings } = useSettings();
  const updateSettings = useUpdateSettings();

  const activeTab: HomeTab =
    (settings?.userPreferences?.project_home_active_tab as HomeTab) || "activities";

  const handleTabChange = (value: string) => {
    updateSettings.mutate({
      project_home_active_tab: value as HomeTab,
    });
  };

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
      <TabsList className="grid w-full grid-cols-2 mb-4">
        <TabsTrigger value="activities">Activities</TabsTrigger>
        <TabsTrigger value="tasks">Tasks</TabsTrigger>
      </TabsList>
      <TabsContent value="activities" className="mt-0">
        <ProjectHomeActivities projectId={projectId} />
      </TabsContent>
      <TabsContent value="tasks" className="mt-0">
        <ProjectHomeTasks projectId={projectId} />
      </TabsContent>
    </Tabs>
  );
}
