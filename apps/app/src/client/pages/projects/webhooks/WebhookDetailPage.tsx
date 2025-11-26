import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Edit,
  Trash2,
  Play,
  Pause,
  Copy,
  Check,
  Eye,
  EyeOff,
  ChevronDown,
} from "lucide-react";
import { useProjectId } from "@/client/hooks/useProjectId";
import { useWebhook } from "./hooks/useWebhook";
import { useWebhookMutations } from "./hooks/useWebhookMutations";
import { useWebhookWebSocket } from "./hooks/useWebhookWebSocket";
import { WebhookStatusBadge } from "./components/WebhookStatusBadge";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/client/components/ui/dropdown-menu";
import { api } from "@/client/utils/api";
import type { SpecTypeMetadata } from "@/client/pages/projects/workflows/components/SpecTypeSelect";
import { PageHeader } from "@/client/components/PageHeader";

export default function WebhookDetailPage() {
  const projectId = useProjectId();
  const { webhookId } = useParams<{ webhookId: string }>();
  const navigate = useNavigate();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [urlCopied, setUrlCopied] = useState(false);
  const [secretCopied, setSecretCopied] = useState(false);
  const [secretRevealed, setSecretRevealed] = useState(false);

  if (!webhookId) {
    throw new Error("Missing webhookId");
  }

  const { data: webhook, isLoading } = useWebhook(webhookId);
  const { activateMutation, pauseMutation } = useWebhookMutations(projectId);

  // Fetch webhook URL from server
  const { data: webhookUrlData } = useQuery({
    queryKey: ["webhookUrl", webhookId],
    queryFn: async () => {
      const response = await api.get<{ url: string }>(
        `/api/webhooks/${webhookId}/url`
      );
      return response;
    },
    enabled: !!webhookId,
  });

  const webhookUrl = webhookUrlData?.url || "";

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
      const response = await api.get<{
        data: { id: string; name: string; identifier: string }[];
      }>(`/api/projects/${projectId}/workflows`);
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

  const handleCopyUrl = async () => {
    if (!webhookUrl) return;
    await navigator.clipboard.writeText(webhookUrl);
    setUrlCopied(true);
    setTimeout(() => setUrlCopied(false), 2000);
  };

  const handleCopySecret = async () => {
    if (!webhook) return;
    await navigator.clipboard.writeText(webhook.secret);
    setSecretCopied(true);
    setTimeout(() => setSecretCopied(false), 2000);
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
            to={`/projects/${projectId}/workflows/triggers`}
            className="text-blue-600 hover:underline"
          >
            Back to webhooks
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        breadcrumbs={[
          { label: "Project", href: `/projects/${projectId}` },
          { label: "Workflows", href: `/projects/${projectId}/workflows` },
          {
            label: "Triggers",
            href: `/projects/${projectId}/workflows/triggers`,
          },
          { label: webhook.name },
        ]}
        title={webhook.name}
        description={webhook.description || undefined}
        afterTitle={<WebhookStatusBadge status={webhook.status} />}
        actions={
          <>
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
            <div className="flex items-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  navigate(
                    `/projects/${projectId}/workflows/triggers/${webhookId}/edit`
                  )
                }
                className="rounded-r-none border-r-0 h-9"
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-l-none px-2 h-9"
                  >
                    <ChevronDown className="h-4 w-4" />
                    <span className="sr-only">Open menu</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={handleDelete}
                    className="text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </>
        }
      />

      <div className="flex-1 overflow-auto p-6 space-y-6">
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
              <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-md border group">
                <code className="flex-1 text-sm font-mono text-foreground select-all break-all">
                  {webhookUrl}
                </code>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={handleCopyUrl}
                  className="shrink-0"
                >
                  {urlCopied ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Secret */}
            <div>
              <div className="text-sm font-medium text-muted-foreground mb-2">
                Webhook Secret
              </div>
              <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-md border group">
                <code className="flex-1 text-sm font-mono text-foreground select-all">
                  {secretRevealed ? webhook.secret : "•".repeat(32)}
                </code>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setSecretRevealed(!secretRevealed)}
                  className="shrink-0"
                >
                  {secretRevealed ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={handleCopySecret}
                  className="shrink-0"
                >
                  {secretCopied ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Mappings */}
            {webhook.config.mappings && webhook.config.mappings.length > 0 && (
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-3">
                  Workflow Run Mapping
                </div>
                <div className="space-y-3">
                  {webhook.config.mappings.map((mapping, idx) => (
                    <div key={idx}>
                      <div className="border rounded-lg p-4">
                        <div className="space-y-3">
                          {/* Mapping Fields */}
                          <div className="grid grid-cols-2 gap-3">
                            {mapping.spec_type_id && (
                              <div>
                                <div className="text-xs font-medium text-muted-foreground mb-1">
                                  Spec Type
                                </div>
                                <div className="text-sm px-3 py-2 rounded border">
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
                                <div className="text-sm px-3 py-2 rounded border">
                                  <div className="font-medium">
                                    {getWorkflowName(
                                      mapping.workflow_definition_id
                                    )}
                                  </div>
                                  <div className="text-xs text-muted-foreground font-mono mt-0.5 truncate">
                                    {mapping.workflow_definition_id}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Conditions */}
                          {mapping.conditions &&
                            mapping.conditions.length > 0 && (
                              <div className="pt-2 border-t">
                                <div className="text-xs font-medium text-muted-foreground mb-2">
                                  Conditions ({mapping.conditions.length})
                                </div>
                                <div className="space-y-1.5">
                                  {mapping.conditions.map(
                                    (condition, condIdx) => (
                                      <div
                                        key={condIdx}
                                        className="text-xs px-2 py-1.5 rounded border flex items-center gap-2"
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
                                    )
                                  )}
                                </div>
                              </div>
                            )}
                        </div>
                      </div>

                      {/* Separator between mappings */}
                      {idx < webhook.config.mappings.length - 1 && (
                        <div className="text-center py-4 text-sm font-medium text-muted-foreground uppercase tracking-wide">
                          If that doesn't match, then
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
        <EventHistory webhookId={webhookId} projectId={projectId} />

        <DeleteWebhookDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          webhook={webhook}
          onSuccess={() => navigate(`/projects/${projectId}/workflows/triggers`)}
        />
      </div>
    </div>
  );
}
