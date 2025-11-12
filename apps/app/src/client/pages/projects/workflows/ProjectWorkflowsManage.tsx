import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ChevronLeft, RefreshCw } from "lucide-react";
import { Button } from "@/client/components/ui/button";
import { WorkflowDefinitionsTable } from "./components/WorkflowDefinitionsTable";
import { ArchiveWorkflowDialog } from "./components/ArchiveWorkflowDialog";
import { UnarchiveWorkflowDialog } from "./components/UnarchiveWorkflowDialog";
import { useWorkflowDefinitions } from "./hooks/useWorkflowDefinitions";
import { useArchiveWorkflowDefinition } from "./hooks/useArchiveWorkflowDefinition";
import { useUnarchiveWorkflowDefinition } from "./hooks/useUnarchiveWorkflowDefinition";
import { useResyncWorkflows } from "./hooks/useResyncWorkflows";
import type { WorkflowDefinition } from "@/client/pages/projects/workflows/types";

export function ProjectWorkflowsManage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [unarchiveDialogOpen, setUnarchiveDialogOpen] = useState(false);
  const [selectedDefinition, setSelectedDefinition] = useState<WorkflowDefinition | null>(null);

  // Fetch active and archived workflows separately
  const {
    data: activeDefinitions = [],
    isLoading: isLoadingActive,
  } = useWorkflowDefinitions(projectId!, 'active');

  const {
    data: archivedDefinitions = [],
    isLoading: isLoadingArchived,
  } = useWorkflowDefinitions(projectId!, 'archived');

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
    <div className="container mx-auto py-6 px-4 max-w-7xl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Manage Workflows</h1>
            <p className="text-muted-foreground mt-1">
              Archive or unarchive workflow definitions for this project
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link to={`/projects/${projectId}/workflows`}>
              <Button variant="ghost" size="sm">
                <ChevronLeft className="w-4 h-4 mr-1" />
                Back to Workflows
              </Button>
            </Link>
            <Button
              onClick={() => resyncMutation.mutate()}
              disabled={resyncMutation.isPending}
              variant="outline"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${resyncMutation.isPending ? "animate-spin" : ""}`} />
              {resyncMutation.isPending ? "Resyncing..." : "Resync Workflows"}
            </Button>
          </div>
        </div>
      </div>

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

      {/* Dialogs */}
      <ArchiveWorkflowDialog
        open={archiveDialogOpen}
        onOpenChange={setArchiveDialogOpen}
        workflowName={selectedDefinition?.name || ''}
        runCount={selectedDefinition?._count?.activeRuns || 0}
        onConfirm={handleArchiveConfirm}
        isPending={archiveMutation.isPending}
      />

      <UnarchiveWorkflowDialog
        open={unarchiveDialogOpen}
        onOpenChange={setUnarchiveDialogOpen}
        workflowName={selectedDefinition?.name || ''}
        onConfirm={handleUnarchiveConfirm}
        isPending={unarchiveMutation.isPending}
      />
    </div>
  );
}
