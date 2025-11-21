import { useNavigate } from "react-router-dom";
import { Plus, Webhook } from "lucide-react";
import { Button } from "@/client/components/ui/button";
import { useProjectId } from "@/client/hooks/useProjectId";
import { WebhookList } from "./components/WebhookList";
import { useWebhooks } from "./hooks/useWebhooks";
import { WorkflowTabs } from "../workflows/components/WorkflowTabs";
import { PageHeader } from "@/client/components/PageHeader";

export default function ProjectWebhooksPage() {
  const projectId = useProjectId();
  const navigate = useNavigate();

  const { data: webhooks, isLoading } = useWebhooks(projectId);

  const handleCreateWebhook = () => {
    navigate(`/projects/${activeProjectId}/workflows/triggers/new`);
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
          { label: "Project", href: `/projects/${activeProjectId}` },
          { label: "Workflows", href: `/projects/${activeProjectId}/workflows` },
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
            <div className="max-w-md text-center">
              <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <Webhook className="h-8 w-8 text-primary" />
              </div>
              <h2 className="mb-2 text-lg font-semibold">No webhooks yet</h2>
              <p className="mb-6 text-sm text-muted-foreground">
                Create your first webhook to automatically trigger workflows
                when external events occur from GitHub, Linear, Jira, or custom
                sources.
              </p>
              <Button onClick={handleCreateWebhook} variant="outline">
                <Plus className="h-4 w-4" />
                New Webhook Trigger
              </Button>
            </div>
          </div>
        ) : (
          <div>
            <h2 className="text-lg font-semibold mb-4">Webhooks</h2>
            <WebhookList webhooks={webhooks || []} projectId={activeProjectId!} />
          </div>
        )}
      </div>
    </div>
  );
}
