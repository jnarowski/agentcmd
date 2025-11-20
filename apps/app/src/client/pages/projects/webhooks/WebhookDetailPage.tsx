import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Edit, Trash2, Play, Pause, ChevronRight } from "lucide-react";
import { useWebhook } from "./hooks/useWebhook";
import { useWebhookMutations } from "./hooks/useWebhookMutations";
import { useWebhookWebSocket } from "./hooks/useWebhookWebSocket";
import { WebhookStatusBadge } from "./components/WebhookStatusBadge";
import { SecretDisplay } from "./components/SecretDisplay";
import { EventHistory } from "./components/EventHistory";
import { DeleteWebhookDialog } from "./components/DeleteWebhookDialog";
import { Button } from "@/client/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/client/components/ui/card";
import { Badge } from "@/client/components/ui/badge";

export default function WebhookDetailPage() {
  const { id: projectId, webhookId } = useParams<{
    id: string;
    webhookId: string;
  }>();
  const navigate = useNavigate();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  if (!projectId || !webhookId) {
    throw new Error("Missing projectId or webhookId");
  }

  const { data: webhook, isLoading } = useWebhook(webhookId);
  const { activateMutation, pauseMutation } = useWebhookMutations(projectId);

  // Listen for real-time events
  useWebhookWebSocket(projectId, webhookId);

  const handleActivate = () => {
    activateMutation.mutate({ webhookId });
  };

  const handlePause = () => {
    pauseMutation.mutate({ webhookId });
  };

  const handleDelete = () => {
    setDeleteDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="px-6 py-4">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3" />
          <div className="h-64 bg-gray-200 rounded" />
          <div className="h-96 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  if (!webhook) {
    return (
      <div className="px-6 py-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold">Webhook not found</h2>
          <Link to={`/projects/${projectId}/webhooks`} className="text-blue-600 hover:underline">
            Back to webhooks
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="px-6 py-4 space-y-6">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2 text-sm text-gray-600">
        <Link to={`/projects/${projectId}`} className="hover:text-gray-900">
          Project
        </Link>
        <ChevronRight className="w-4 h-4" />
        <Link to={`/projects/${projectId}/webhooks`} className="hover:text-gray-900">
          Webhooks
        </Link>
        <ChevronRight className="w-4 h-4" />
        <span className="text-gray-900 font-medium">{webhook.name}</span>
      </nav>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold">{webhook.name}</h1>
            <WebhookStatusBadge status={webhook.status} />
          </div>
          {webhook.description && (
            <p className="text-gray-600">{webhook.description}</p>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/projects/${projectId}/webhooks/${webhookId}/edit`)}
          >
            <Edit className="w-4 h-4 mr-2" />
            Edit
          </Button>
          {webhook.status === "draft" || webhook.status === "paused" ? (
            <Button
              variant="default"
              size="sm"
              onClick={handleActivate}
              disabled={activateMutation.isPending}
            >
              <Play className="w-4 h-4 mr-2" />
              Activate
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={handlePause}
              disabled={pauseMutation.isPending}
            >
              <Pause className="w-4 h-4 mr-2" />
              Pause
            </Button>
          )}
          <Button variant="destructive" size="sm" onClick={handleDelete}>
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="text-sm font-medium text-gray-700 mb-1">Source</div>
            <Badge variant="secondary">{webhook.source}</Badge>
          </div>

          <div>
            <div className="text-sm font-medium text-gray-700 mb-1">Webhook URL</div>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={webhook.webhook_url}
                className="flex-1 px-3 py-2 border rounded-md bg-gray-50 text-sm font-mono"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(webhook.webhook_url);
                }}
              >
                Copy
              </Button>
            </div>
          </div>

          <SecretDisplay secret={webhook.secret} />

          {webhook.workflow_identifier && (
            <div>
              <div className="text-sm font-medium text-gray-700 mb-1">Workflow</div>
              <Badge variant="secondary">{webhook.workflow_identifier}</Badge>
            </div>
          )}

          {webhook.config.mappings && webhook.config.mappings.length > 0 && (
            <div>
              <div className="text-sm font-medium text-gray-700 mb-2">Mappings</div>
              <div className="space-y-2">
                {webhook.config.mappings.map((mapping, idx) => (
                  <div key={idx} className="text-sm bg-gray-50 p-2 rounded">
                    <div className="font-mono text-sm">
                      <span className="text-blue-600">spec_type_id:</span> {mapping.spec_type_id}
                    </div>
                    <div className="font-mono text-sm">
                      <span className="text-blue-600">workflow_id:</span> {mapping.workflow_id}
                    </div>
                    {mapping.conditions && mapping.conditions.length > 0 && (
                      <div className="mt-1 text-xs text-gray-500">
                        {mapping.conditions.length} condition(s)
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Event History */}
      <EventHistory webhookId={webhookId} />

      <DeleteWebhookDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        webhook={webhook}
        onSuccess={() => navigate(`/projects/${projectId}/webhooks`)}
      />
    </div>
  );
}
