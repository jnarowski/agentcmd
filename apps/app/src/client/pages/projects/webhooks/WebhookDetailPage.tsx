import { useParams, useNavigate, Link } from "react-router-dom";
import { Edit, Trash2, Play, Pause, RefreshCw, ChevronRight } from "lucide-react";
import { useWebhook } from "./hooks/useWebhook";
import { useWebhookMutations } from "./hooks/useWebhookMutations";
import { useWebhookWebSocket } from "./hooks/useWebhookWebSocket";
import { WebhookStatusBadge } from "./components/WebhookStatusBadge";
import { SecretDisplay } from "./components/SecretDisplay";
import { EventHistory } from "./components/EventHistory";
import { Button } from "@/client/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/client/components/ui/card";
import { Badge } from "@/client/components/ui/badge";

export default function WebhookDetailPage() {
  const { id: projectId, webhookId } = useParams<{
    id: string;
    webhookId: string;
  }>();
  const navigate = useNavigate();

  if (!projectId || !webhookId) {
    throw new Error("Missing projectId or webhookId");
  }

  const { data: webhook, isLoading } = useWebhook(webhookId);
  const { activateMutation, pauseMutation, rotateSecretMutation, deleteMutation } =
    useWebhookMutations(projectId);

  // Listen for real-time events
  useWebhookWebSocket(projectId, webhookId);

  const handleActivate = () => {
    activateMutation.mutate({ webhookId });
  };

  const handlePause = () => {
    pauseMutation.mutate({ webhookId });
  };

  const handleRotateSecret = () => {
    if (
      confirm(
        "Are you sure you want to rotate the secret? You'll need to update the external webhook configuration."
      )
    ) {
      rotateSecretMutation.mutate({ webhookId });
    }
  };

  const handleDelete = () => {
    if (
      confirm(
        "Are you sure you want to delete this webhook? This action cannot be undone."
      )
    ) {
      deleteMutation.mutate(
        { webhookId },
        {
          onSuccess: () => {
            navigate(`/projects/${projectId}/webhooks`);
          },
        }
      );
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
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
      <div className="container mx-auto py-8">
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
    <div className="container mx-auto py-8 space-y-6">
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
          <Button
            variant="outline"
            size="sm"
            onClick={handleRotateSecret}
            disabled={rotateSecretMutation.isPending}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Rotate Secret
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
          >
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

          {webhook.config.field_mappings && webhook.config.field_mappings.length > 0 && (
            <div>
              <div className="text-sm font-medium text-gray-700 mb-2">Field Mappings</div>
              <div className="space-y-2">
                {webhook.config.field_mappings.map((mapping, idx) => (
                  <div key={idx} className="text-sm bg-gray-50 p-2 rounded">
                    <span className="font-mono text-blue-600">{mapping.field}</span>
                    {" → "}
                    {mapping.type === "input" ? (
                      <span className="font-mono text-gray-700">{mapping.value}</span>
                    ) : (
                      <span className="text-gray-500">conditional</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {webhook.webhook_conditions && webhook.webhook_conditions.length > 0 && (
            <div>
              <div className="text-sm font-medium text-gray-700 mb-2">Conditions</div>
              <div className="space-y-2">
                {webhook.webhook_conditions.map((condition, idx) => (
                  <div key={idx} className="text-sm bg-gray-50 p-2 rounded font-mono">
                    {condition.path} {condition.operator}{" "}
                    {condition.value != null && (
                      <span className="text-gray-700">
                        {typeof condition.value === "object"
                          ? JSON.stringify(condition.value)
                          : String(condition.value)}
                      </span>
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
    </div>
  );
}
