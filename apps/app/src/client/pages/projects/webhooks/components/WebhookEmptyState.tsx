import { Button } from "@/client/components/ui/button";
import { Workflow, Plus, ExternalLink } from "lucide-react";
import { getWebsiteUrl } from "@/client/utils/envConfig";

interface WebhookEmptyStateProps {
  onCreateWebhook: () => void;
}

/**
 * Shared empty state for webhooks/triggers
 * Used in ProjectHomeWorkflows and ProjectWebhooksPage
 */
export function WebhookEmptyState({ onCreateWebhook }: WebhookEmptyStateProps) {
  return (
    <div className="py-12 text-center space-y-4">
      <div className="flex justify-center">
        <div className="p-3 bg-primary/10 rounded-full">
          <Workflow className="size-6 text-primary" />
        </div>
      </div>
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">No webhooks yet</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Configure webhooks to trigger workflows from external services
        </p>
      </div>
      <div className="flex gap-2 justify-center">
        <Button onClick={onCreateWebhook} className="gap-2">
          <Plus className="size-4" />
          Create your first webhook
        </Button>
        <Button variant="outline" className="gap-2" asChild>
          <a
            href={`${getWebsiteUrl()}/docs/webhooks`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <ExternalLink className="size-4" />
            Learn More
          </a>
        </Button>
      </div>
    </div>
  );
}
