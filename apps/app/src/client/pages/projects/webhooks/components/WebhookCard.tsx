import { formatDistanceToNow } from "date-fns";
import { Github, Box, Webhook } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { Webhook as WebhookType } from "../types/webhook.types";
import { WebhookStatusBadge } from "./WebhookStatusBadge";
import { WebhookDropdownMenu } from "./WebhookDropdownMenu";

export interface WebhookCardProps {
  webhook: WebhookType;
  projectId: string;
}

function getSourceIcon(source: string) {
  switch (source) {
    case "github":
      return Github;
    case "linear":
    case "jira":
      return Box;
    case "generic":
    default:
      return Webhook;
  }
}

function getSourceLabel(source: string) {
  switch (source) {
    case "github":
      return "GitHub";
    case "linear":
      return "Linear";
    case "jira":
      return "Jira";
    case "generic":
    default:
      return "Generic";
  }
}

export function WebhookCard({ webhook, projectId }: WebhookCardProps) {
  const navigate = useNavigate();
  const SourceIcon = getSourceIcon(webhook.source);

  const handleCardClick = () => {
    navigate(`/projects/${projectId}/workflows/triggers/${webhook.id}`);
  };

  const lastTriggered = webhook.last_triggered_at
    ? formatDistanceToNow(new Date(webhook.last_triggered_at), {
        addSuffix: true,
      })
    : "Never";

  return (
    <div
      className="group relative cursor-pointer rounded-lg border bg-card p-4 shadow-sm transition-all hover:shadow-md hover:border-primary/50"
      onClick={handleCardClick}
      role="button"
      tabIndex={0}
      aria-label={`Webhook ${webhook.name}, status ${webhook.status}`}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleCardClick();
        }
      }}
    >
      {/* Header */}
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <SourceIcon className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-sm text-foreground truncate">
              {webhook.name}
            </h3>
            <p className="text-xs text-muted-foreground truncate">
              {getSourceLabel(webhook.source)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <WebhookStatusBadge status={webhook.status} size="sm" />
          <WebhookDropdownMenu webhook={webhook} projectId={projectId} />
        </div>
      </div>

      {/* Description */}
      {webhook.description && (
        <p className="mb-3 text-sm text-muted-foreground line-clamp-2">
          {webhook.description}
        </p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-4">
          <div>
            <span className="text-muted-foreground">Last triggered: </span>
            <span className="text-foreground">{lastTriggered}</span>
          </div>
        </div>
        {webhook.error_count > 0 && (
          <div className="inline-flex items-center gap-1 rounded-full bg-red-100 dark:bg-red-900/30 px-2 py-1">
            <span className="font-medium text-red-700 dark:text-red-400">
              {webhook.error_count}
            </span>
            <span className="text-red-600 dark:text-red-400">
              {webhook.error_count === 1 ? "error" : "errors"}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
