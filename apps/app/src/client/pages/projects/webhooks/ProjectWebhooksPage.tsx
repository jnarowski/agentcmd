import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { Button } from "@/client/components/ui/button";
import { useProjectId } from "@/client/hooks/useProjectId";
import { WebhookList } from "./components/WebhookList";
import { WebhookEmptyState } from "./components/WebhookEmptyState";
import { DeleteWebhookDialog } from "./components/DeleteWebhookDialog";
import { useWebhooks } from "./hooks/useWebhooks";
import { WorkflowTabs } from "../workflows/components/WorkflowTabs";
import { PageHeader } from "@/client/components/PageHeader";
import type { Webhook } from "./types/webhook.types";

export default function ProjectWebhooksPage() {
  const projectId = useProjectId();
  const navigate = useNavigate();
  const [deleteTarget, setDeleteTarget] = useState<Webhook | null>(null);

  const { data: webhooks, isLoading } = useWebhooks(projectId);

  const handleCreateWebhook = () => {
    navigate(`/projects/${projectId}/workflows/triggers/new`);
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="mb-4 inline-flex h-12 w-12 animate-spin items-center justify-center rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading webhooks...</p>
        </div>
      </div>
    );
  }

  const showEmptyState = !webhooks || webhooks.length === 0;

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        breadcrumbs={[
          { label: "Project", href: `/projects/${projectId}` },
          { label: "Workflows", href: `/projects/${projectId}/workflows` },
          { label: "Triggers" },
        ]}
        title="Workflow Triggers"
        description="Configure webhooks to trigger workflows from external events"
        actions={
          <Button
            onClick={handleCreateWebhook}
            variant="outline"
            className="flex-1 md:flex-none"
          >
            <Plus className="h-4 w-4" />
            New Webhook Trigger
          </Button>
        }
        belowHeader={<WorkflowTabs />}
      />

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {showEmptyState ? (
          <div className="flex h-full items-center justify-center">
            <WebhookEmptyState onCreateWebhook={handleCreateWebhook} />
          </div>
        ) : (
          <div>
            <h2 className="text-lg font-semibold mb-4">Webhooks</h2>
            <WebhookList
              webhooks={webhooks || []}
              projectId={projectId}
              onDelete={setDeleteTarget}
            />
          </div>
        )}
      </div>

      {/* Delete dialog at page level - outside clickable elements */}
      {deleteTarget && (
        <DeleteWebhookDialog
          open={!!deleteTarget}
          onOpenChange={(open) => !open && setDeleteTarget(null)}
          webhook={deleteTarget}
        />
      )}
    </div>
  );
}
