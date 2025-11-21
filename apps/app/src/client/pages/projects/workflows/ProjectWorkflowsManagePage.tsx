import { useState } from "react";
import { useParams } from "react-router-dom";
import { RefreshCw } from "lucide-react";
import { Button } from "@/client/components/ui/button";
import { WorkflowDefinitionsTable } from "./components/WorkflowDefinitionsTable";
import { ArchiveWorkflowDialog } from "./components/ArchiveWorkflowDialog";
import { UnarchiveWorkflowDialog } from "./components/UnarchiveWorkflowDialog";
import { useWorkflowDefinitions } from "./hooks/useWorkflowDefinitions";
import { useArchiveWorkflowDefinition } from "./hooks/useArchiveWorkflowDefinition";
import { useUnarchiveWorkflowDefinition } from "./hooks/useUnarchiveWorkflowDefinition";
import { useResyncWorkflows } from "./hooks/useResyncWorkflows";
import type { WorkflowDefinition } from "@/client/pages/projects/workflows/types";
import { WorkflowTabs } from "./components/WorkflowTabs";
import { BreadcrumbSection } from "@/client/components/ui/breadcrumb-section";

function ProjectWorkflowsManagePage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [unarchiveDialogOpen, setUnarchiveDialogOpen] = useState(false);
  const [selectedDefinition, setSelectedDefinition] =
    useState<WorkflowDefinition | null>(null);

  // Fetch active and archived workflows separately
  const { data: activeDefinitions = [], isLoading: isLoadingActive } =
    useWorkflowDefinitions(projectId!, "active");

  const { data: archivedDefinitions = [], isLoading: isLoadingArchived } =
    useWorkflowDefinitions(projectId!, "archived");

  const archiveMutation = useArchiveWorkflowDefinition();
  const unarchiveMutation = useUnarchiveWorkflowDefinition();
  const resyncMutation = useResyncWorkflows();

  const handleArchiveClick = (definition: WorkflowDefinition) => {
    setSelectedDefinition(definition);
    setArchiveDialogOpen(true);
  };

  const handleUnarchiveClick = (definition: WorkflowDefinition) => {
    setSelectedDefinition(definition);
    setUnarchiveDialogOpen(true);
  };

  const handleArchiveConfirm = () => {
    if (selectedDefinition) {
      archiveMutation.mutate(selectedDefinition.id, {
        onSuccess: () => {
          setArchiveDialogOpen(false);
          setSelectedDefinition(null);
        },
      });
    }
  };

  const handleUnarchiveConfirm = () => {
    if (selectedDefinition) {
      unarchiveMutation.mutate(selectedDefinition.id, {
        onSuccess: () => {
          setUnarchiveDialogOpen(false);
          setSelectedDefinition(null);
        },
      });
    }
  };

  return (
    <div className="flex h-full flex-col">
      <BreadcrumbSection
        items={[
          { label: "Project", href: `/projects/${projectId}` },
          { label: "Workflows", href: `/projects/${projectId}/workflows` },
          { label: "Workflow Definitions" },
        ]}
      />

      {/* Header */}
      <div className="border-b bg-background px-4 py-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold">
              Workflow Definitions
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage workflow definitions for this project
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => resyncMutation.mutate()}
              disabled={resyncMutation.isPending}
              variant="outline"
            >
              <RefreshCw
                className={`w-4 h-4 md:mr-2 ${resyncMutation.isPending ? "animate-spin" : ""}`}
              />
              <span className="hidden md:inline">
                {resyncMutation.isPending ? "Resyncing..." : "Resync Workflows"}
              </span>
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-4">
          <WorkflowTabs />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto px-4 py-4">
        {/* Active Workflows Section */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Active Workflows</h2>
          <WorkflowDefinitionsTable
            definitions={activeDefinitions}
            onArchive={handleArchiveClick}
            isArchived={false}
            isLoading={isLoadingActive}
          />
        </div>

        {/* Archived Workflows Section */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Archived Workflows</h2>
          <WorkflowDefinitionsTable
            definitions={archivedDefinitions}
            onUnarchive={handleUnarchiveClick}
            isArchived={true}
            isLoading={isLoadingArchived}
          />
        </div>
      </div>

      {/* Dialogs */}
      <ArchiveWorkflowDialog
        open={archiveDialogOpen}
        onOpenChange={setArchiveDialogOpen}
        workflowName={selectedDefinition?.name || ""}
        runCount={selectedDefinition?._count?.activeRuns || 0}
        onConfirm={handleArchiveConfirm}
        isPending={archiveMutation.isPending}
      />

      <UnarchiveWorkflowDialog
        open={unarchiveDialogOpen}
        onOpenChange={setUnarchiveDialogOpen}
        workflowName={selectedDefinition?.name || ""}
        onConfirm={handleUnarchiveConfirm}
        isPending={unarchiveMutation.isPending}
      />
    </div>
  );
}

export default ProjectWorkflowsManagePage;
