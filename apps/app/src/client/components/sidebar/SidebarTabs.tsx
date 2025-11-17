import { useEffect } from "react";
import { useParams } from "react-router-dom";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/client/components/ui/tabs";
import { useSettings, useUpdateSettings } from "@/client/hooks/useSettings";
import { useNavigationStore } from "@/client/stores/navigationStore";
import { NavSpecs } from "./NavSpecs";
import { NavActivities } from "./NavActivities";
import { ProjectCombobox } from "./ProjectCombobox";
import { useSpecs } from "@/client/hooks/useSpecs";

export function SidebarTabs() {
  const { data: settings } = useSettings();
  const updateSettings = useUpdateSettings();
  const { activeSessionId, activeProjectId } = useNavigationStore();
  const { runId } = useParams();

  const activeTab =
    settings?.userPreferences?.sidebar_active_tab || "activities";

  // Auto-switch to Activities tab when entering session or workflow run
  // (Comment out this useEffect to disable auto-switching behavior)
  useEffect(() => {
    if (activeSessionId || runId) {
      updateSettings.mutate({ sidebar_active_tab: "activities" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSessionId, runId]);

  // Count specs filtered by active project
  const { data: specsData } = useSpecs(activeProjectId || undefined);
  const specsCount = specsData?.specs.length || 0;

  const handleTabChange = (value: string) => {
    updateSettings.mutate({
      sidebar_active_tab: value as "activities" | "tasks",
    });
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      <ProjectCombobox />
      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        className="flex-1 flex flex-col min-h-0 overflow-hidden"
      >
        <div className="pl-2 pr-2 pt-2 shrink-0">
          <TabsList className="w-full grid grid-cols-2 h-7 p-0.5">
            <TabsTrigger value="activities" className="text-xs h-full px-1.5">
              Activities
            </TabsTrigger>
            <TabsTrigger value="tasks" className="text-xs h-full px-1.5">
              Specs ({specsCount})
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="activities" className="flex-1 mt-0 overflow-hidden">
          <NavActivities />
        </TabsContent>

        <TabsContent value="tasks" className="flex-1 mt-0 overflow-hidden">
          <NavSpecs />
        </TabsContent>
      </Tabs>
    </div>
  );
}
