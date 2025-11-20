import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Plus, Search, Webhook } from "lucide-react";
import { Button } from "@/client/components/ui/button";
import { Input } from "@/client/components/ui/input";
import { WebhookList } from "./components/WebhookList";
import { useWebhooks } from "./hooks/useWebhooks";

export default function ProjectWebhooksPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");

  const { data: webhooks, isLoading } = useWebhooks(projectId!);

  const filteredWebhooks = webhooks?.filter((webhook) =>
    webhook.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleCreateWebhook = () => {
    navigate(`/projects/${projectId}/webhooks/new`);
  };

  const handleDeleteWebhook = (webhookId: string) => {
    // Will be implemented in Phase 9 with mutations
    console.log("Delete webhook:", webhookId);
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
      {/* Header */}
      <div className="border-b bg-background px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Webhooks</h1>
            <p className="text-sm text-muted-foreground">
              Configure webhooks to trigger workflows from external events
            </p>
          </div>
          <Button onClick={handleCreateWebhook}>
            <Plus className="mr-2 h-4 w-4" />
            Create Webhook
          </Button>
        </div>
      </div>

      {/* Search bar (only show if webhooks exist) */}
      {!showEmptyState && (
        <div className="border-b bg-background px-6 py-3">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search webhooks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
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
              <Button onClick={handleCreateWebhook}>
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Webhook
              </Button>
            </div>
          </div>
        ) : (
          <WebhookList
            webhooks={filteredWebhooks || []}
            projectId={projectId!}
            onDelete={handleDeleteWebhook}
          />
        )}
      </div>
    </div>
  );
}
