import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/client/components/ui/tabs";
import type { WorkflowTab } from "@/client/pages/projects/workflows/hooks/useWorkflowDetailPanel";
import { DetailsTab } from "./DetailsTab";
import { SessionTab } from "./SessionTab";
import { ArtifactsTab } from "./ArtifactsTab";
import { LogsTab } from "./LogsTab";
import type { WorkflowRun } from "@/client/pages/projects/workflows/types";

interface WorkflowDetailPanelProps {
  run: WorkflowRun;
  projectId: string;
  activeTab: WorkflowTab;
  setActiveTab: (tab: WorkflowTab) => void;
  selectedSessionId: string | null;
  selectedStepId: string | null;
}

export function WorkflowDetailPanel({
  run,
  projectId,
  activeTab,
  setActiveTab,
  selectedSessionId,
  selectedStepId,
}: WorkflowDetailPanelProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Header with tabs - matches Timeline header height */}
      <div className="border-b px-6 py-3">
        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as WorkflowTab)}
          className="w-full"
        >
          <TabsList className="w-full">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="session">Session</TabsTrigger>
            <TabsTrigger value="logs">Logs</TabsTrigger>
            <TabsTrigger value="artifacts">Artifacts</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Tab content */}
      <div className="flex-1 min-h-0">
        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as WorkflowTab)}
          className="h-full"
        >
          <TabsContent
            value="details"
            className="p-6 mt-0 h-full overflow-y-auto"
          >
            <DetailsTab run={run} />
          </TabsContent>

          <TabsContent value="session" className="mt-0 h-full overflow-y-auto">
            <SessionTab
              projectId={projectId}
              selectedSessionId={selectedSessionId}
            />
          </TabsContent>

          <TabsContent value="logs" className="p-0 mt-0 h-full">
            <LogsTab run={run} selectedStepId={selectedStepId} />
          </TabsContent>

          <TabsContent
            value="artifacts"
            className="p-6 mt-0 h-full overflow-y-auto"
          >
            <ArtifactsTab run={run} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
