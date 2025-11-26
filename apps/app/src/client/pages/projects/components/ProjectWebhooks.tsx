import { useState } from "react";
import { Button } from "@/client/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/client/components/ui/card";
import { useNavigate } from "react-router-dom";
import { Webhook, Plus } from "lucide-react";
import { useWebhooks } from "@/client/pages/projects/webhooks/hooks/useWebhooks";
import { WebhookCard } from "@/client/pages/projects/webhooks/components/WebhookCard";
import { DeleteWebhookDialog } from "@/client/pages/projects/webhooks/components/DeleteWebhookDialog";
import type { Webhook as WebhookType } from "@/client/pages/projects/webhooks/types/webhook.types";

interface ProjectWebhooksProps {
  projectId: string;
}

/**
 * Webhooks section for project home page
 * Shows configured webhooks
 */
export function ProjectWebhooks({ projectId }: ProjectWebhooksProps) {
  const navigate = useNavigate();
  const [deleteTarget, setDeleteTarget] = useState<WebhookType | null>(null);
  const { data: webhooks, isLoading, error } = useWebhooks(projectId);

  const handleCreateWebhook = () => {
    navigate(`/projects/${projectId}/webhooks/new`);
  };

  if (error) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-destructive">
          Failed to load webhooks
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          Loading webhooks...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
          <span className="truncate">Webhooks</span>
          <Button
            variant="outline"
            size="sm"
            className="ml-auto h-8 gap-1.5"
            onClick={handleCreateWebhook}
          >
            <Plus className="size-4" />
            New
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Webhooks Grid */}
          {webhooks && webhooks.length > 0 && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {webhooks.map((webhook) => (
                <WebhookCard
                  key={webhook.id}
                  webhook={webhook}
                  projectId={projectId}
                  onDelete={() => setDeleteTarget(webhook)}
                />
              ))}
            </div>
          )}

          {/* Empty state */}
          {webhooks && webhooks.length === 0 && (
            <div className="py-12 text-center space-y-4">
              <div className="flex justify-center">
                <div className="p-3 bg-primary/10 rounded-full">
                  <Webhook className="size-6 text-primary" />
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">No webhooks yet</h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  Webhooks allow external services to trigger workflows in your
                  project automatically.
                </p>
              </div>
              <Button onClick={handleCreateWebhook} className="gap-2">
                <Plus className="size-4" />
                Create your first webhook
              </Button>
            </div>
          )}
        </div>

        {/* Delete dialog at component level */}
        {deleteTarget && (
          <DeleteWebhookDialog
            open={!!deleteTarget}
            onOpenChange={(open) => !open && setDeleteTarget(null)}
            webhook={deleteTarget}
          />
        )}
      </CardContent>
    </Card>
  );
}
