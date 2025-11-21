import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Edit, Trash2, Play, Pause, ChevronRight } from "lucide-react";
import { useWebhook } from "./hooks/useWebhook";
import { useWebhookMutations } from "./hooks/useWebhookMutations";
import { useWebhookWebSocket } from "./hooks/useWebhookWebSocket";
import { WebhookStatusBadge } from "./components/WebhookStatusBadge";
import { SecretDisplay } from "./components/SecretDisplay";
import { EventHistory } from "./components/EventHistory";
import { DeleteWebhookDialog } from "./components/DeleteWebhookDialog";
import { Button } from "@/client/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/client/components/ui/card";
import { Badge } from "@/client/components/ui/badge";
import { api } from "@/client/utils/api";
import type { SpecTypeMetadata } from "@/client/pages/projects/workflows/components/SpecTypeSelect";

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

  // Fetch spec types for name lookup
  const { data: specTypes } = useQuery({
    queryKey: ["specTypes", projectId],
    queryFn: async () => {
      const response = await api.get<{ data: SpecTypeMetadata[] }>(
        `/api/projects/${projectId}/spec-types`
      );
      return response.data;
    },
    enabled: !!projectId,
  });

  // Fetch workflows for name lookup
  const { data: workflows } = useQuery({
    queryKey: ["workflows", projectId],
    queryFn: async () => {
      const response = await api.get<{ data: { id: string; name: string; identifier: string }[] }>(
        `/api/projects/${projectId}/workflows`
      );
      return response.data;
    },
    enabled: !!projectId,
  });

  // Helper functions to get names
  const getSpecTypeName = (id: string) => {
    const specType = specTypes?.find((st) => st.id === id);
    return specType?.name || id;
  };

  const getWorkflowName = (id: string) => {
    const workflow = workflows?.find((wf) => wf.id === id);
    return workflow?.name || id;
  };

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
          <Link
            to={`/projects/${projectId}/webhooks`}
            className="text-blue-600 hover:underline"
          >
            Back to webhooks
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="px-6 py-4 space-y-6">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link
          to={`/projects/${projectId}`}
          className="hover:text-foreground transition-colors"
        >
          Project
        </Link>
        <ChevronRight className="w-4 h-4" />
        <Link
          to={`/projects/${projectId}/webhooks`}
          className="hover:text-foreground transition-colors"
        >
          Webhooks
        </Link>
        <ChevronRight className="w-4 h-4" />
        <span className="text-foreground font-medium">{webhook.name}</span>
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
            onClick={() =>
              navigate(`/projects/${projectId}/webhooks/${webhookId}/edit`)
            }
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
        <CardContent className="space-y-6">
          {/* Source */}
          <div>
            <div className="text-sm font-medium text-muted-foreground mb-2">
              Source
            </div>
            <Badge variant="secondary" className="text-sm px-3 py-1">
              {webhook.source}
            </Badge>
          </div>

          {/* Webhook URL */}
          <div>
            <div className="text-sm font-medium text-muted-foreground mb-2">
              Webhook URL
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={webhook.webhook_url}
                className="flex-1 px-3 py-2 border rounded-md bg-muted/50 text-sm font-mono text-foreground"
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

          {/* Secret */}
          <SecretDisplay secret={webhook.secret} />

          {/* Mappings */}
          {webhook.config.mappings && webhook.config.mappings.length > 0 && (
            <div>
              <div className="text-sm font-medium text-muted-foreground mb-3">
                Workflow Run Mapping
              </div>
              <div className="space-y-3">
                {webhook.config.mappings.map((mapping, idx) => (
                  <div
                    key={idx}
                    className="border rounded-lg p-4 bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div className="space-y-3">
                      {/* Mapping Fields */}
                      <div className="grid grid-cols-2 gap-3">
                        {mapping.spec_type_id && (
                          <div>
                            <div className="text-xs font-medium text-muted-foreground mb-1">
                              Spec Type
                            </div>
                            <div className="text-sm bg-background px-3 py-2 rounded border">
                              <div className="font-medium">
                                {getSpecTypeName(mapping.spec_type_id)}
                              </div>
                              <div className="text-xs text-muted-foreground font-mono mt-0.5">
                                {mapping.spec_type_id}
                              </div>
                            </div>
                          </div>
                        )}
                        {mapping.workflow_definition_id && (
                          <div>
                            <div className="text-xs font-medium text-muted-foreground mb-1">
                              Workflow
                            </div>
                            <div className="text-sm bg-background px-3 py-2 rounded border">
                              <div className="font-medium">
                                {getWorkflowName(mapping.workflow_definition_id)}
                              </div>
                              <div className="text-xs text-muted-foreground font-mono mt-0.5 truncate">
                                {mapping.workflow_definition_id}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Conditions */}
                      {mapping.conditions && mapping.conditions.length > 0 && (
                        <div className="pt-2 border-t">
                          <div className="text-xs font-medium text-muted-foreground mb-2">
                            Conditions ({mapping.conditions.length})
                          </div>
                          <div className="space-y-1.5">
                            {mapping.conditions.map((condition, condIdx) => (
                              <div
                                key={condIdx}
                                className="text-xs bg-background px-2 py-1.5 rounded border flex items-center gap-2"
                              >
                                <span className="font-mono text-blue-600">
                                  {condition.path}
                                </span>
                                <span className="text-muted-foreground">
                                  {condition.operator}
                                </span>
                                <span className="font-mono">
                                  {typeof condition.value === "string"
                                    ? `"${condition.value}"`
                                    : JSON.stringify(condition.value)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Event History */}
      <EventHistory webhookId={webhookId} projectId={projectId} />

      <DeleteWebhookDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        webhook={webhook}
        onSuccess={() => navigate(`/projects/${projectId}/webhooks`)}
      />
    </div>
  );
}
