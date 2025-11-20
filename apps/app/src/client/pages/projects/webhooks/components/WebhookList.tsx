import type { Webhook } from "../types/webhook.types";
import { WebhookCard } from "./WebhookCard";

export interface WebhookListProps {
  webhooks: Webhook[];
  projectId: string;
  onDelete?: (webhookId: string) => void;
}

export function WebhookList({
  webhooks,
  projectId,
  onDelete,
}: WebhookListProps) {
  if (webhooks.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {webhooks.map((webhook) => (
        <WebhookCard
          key={webhook.id}
          webhook={webhook}
          projectId={projectId}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
