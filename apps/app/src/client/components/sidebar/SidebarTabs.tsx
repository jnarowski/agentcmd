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
import { useProjects } from "@/client/pages/projects/hooks/useProjects";
import { Skeleton } from "@/client/components/ui/skeleton";
import { NavSpecs } from "./NavSpecs";
import { NavSessions } from "./NavSessions";
import { NavWorkflows } from "./NavWorkflows";
import { ProjectCombobox } from "./ProjectCombobox";

export function SidebarTabs() {
  const { data: settings } = useSettings();
  const updateSettings = useUpdateSettings();
  const { activeSessionId } = useNavigationStore();
  const { runId } = useParams();
  const { isLoading: projectsLoading } = useProjects();

  // Migration fallback: old values → new values
  const rawTab = settings?.userPreferences?.sidebar_active_tab;
  let activeTab: "sessions" | "workflows" | "specs" = "sessions";

  if (rawTab === "sessions" || rawTab === "workflows" || rawTab === "specs") {
    activeTab = rawTab;
  } else if (rawTab) {
    // Handle legacy values (stored in DB before migration)
    const legacyTab = rawTab as string;
    if (legacyTab === "tasks") {
      activeTab = "specs";
    } else if (legacyTab === "activities") {
      activeTab = "sessions";
    }
  }

  // Auto-switch to Sessions tab when entering session, Workflows tab when entering workflow run
  // (Comment out this useEffect to disable auto-switching behavior)
  useEffect(() => {
    if (activeSessionId && activeTab !== "sessions") {
      updateSettings.mutate({ sidebar_active_tab: "sessions" });
    } else if (runId && activeTab !== "workflows") {
      updateSettings.mutate({ sidebar_active_tab: "workflows" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSessionId, runId]);

  const handleTabChange = (value: string) => {
    updateSettings.mutate({
      sidebar_active_tab: value as "sessions" | "workflows" | "specs",
    });
  };

  // Show loading state while projects load to prevent project ID flash
  if (projectsLoading) {
    return (
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="p-2">
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="flex-1 flex flex-col gap-2 p-4">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      <ProjectCombobox />
      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        className="flex-1 flex flex-col min-h-0 overflow-hidden"
      >
        <div className="pl-2 pr-2 pt-2 shrink-0">
          <TabsList className="w-full grid grid-cols-3 h-7 p-0.5">
            <TabsTrigger value="sessions" className="text-xs h-full px-1.5">
              Sessions
            </TabsTrigger>
            <TabsTrigger value="workflows" className="text-xs h-full px-1.5">
              Workflows
            </TabsTrigger>
            <TabsTrigger value="specs" className="text-xs h-full px-1.5">
              Specs
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="sessions" className="flex-1 mt-0 overflow-hidden">
          <NavSessions />
        </TabsContent>

        <TabsContent value="workflows" className="flex-1 mt-0 overflow-hidden">
          <NavWorkflows />
        </TabsContent>

        <TabsContent value="specs" className="flex-1 mt-0 overflow-hidden">
          <NavSpecs />
        </TabsContent>
      </Tabs>
    </div>
  );
}
