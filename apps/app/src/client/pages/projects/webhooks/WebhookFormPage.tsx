import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Button } from "@/client/components/ui/button";
import { useProjectId } from "@/client/hooks/useProjectId";
import { useWebhook } from "./hooks/useWebhook";
import { useRecentTestEvent } from "./hooks/useRecentTestEvent";
import { useWebhookMutations } from "./hooks/useWebhookMutations";
import { useWebhookWebSocket } from "./hooks/useWebhookWebSocket";
import { api } from "@/client/utils/api";
import {
  createWebhookFormSchema,
  updateWebhookFormSchema,
  type CreateWebhookFormValues,
  type UpdateWebhookFormValues,
} from "./schemas/webhook.schemas";
import type { Webhook } from "./types/webhook.types";
import { WebhookBasicInfoSection } from "./components/form-sections/WebhookBasicInfoSection";
import { WebhookMappingsSection } from "./components/form-sections/WebhookMappingsSection";
import { PageHeader } from "@/client/components/PageHeader";

/**
 * Convert Webhook to form values
 */
function webhookToFormValues(webhook: Webhook): UpdateWebhookFormValues {
  // Default to simple mode structure
  const defaultConfig = {
    name: "",
    mappings: [
      {
        spec_type_id: "",
        workflow_definition_id: "",
        conditions: [],
      },
    ],
    default_action: undefined,
  };

  return {
    name: webhook.name,
    description: webhook.description || undefined,
    config: webhook.config || defaultConfig,
    // Don't include secret - let it remain undefined so form detects changes
  };
}

export default function WebhookFormPage() {
  const projectId = useProjectId();
  const { webhookId } = useParams<{ webhookId: string }>();
  const navigate = useNavigate();

  // Determine if this is create or edit mode
  const isCreateMode = !webhookId;

  // Hooks - only fetch if in edit mode
  const { data: webhook, isLoading: isLoadingWebhook } = useWebhook(webhookId);
  const { data: testEvent, isLoading: isLoadingTestEvent } =
    useRecentTestEvent(webhookId);
  const { createMutation, updateMutation } = useWebhookMutations(projectId!);

  // WebSocket for real-time updates (only in edit mode)
  useWebhookWebSocket(projectId!, webhookId);

  // Fetch webhook URL from server (only in edit mode)
  const { data: webhookUrlData } = useQuery({
    queryKey: ["webhookUrl", webhookId],
    queryFn: async () => {
      const response = await api.get<{ url: string }>(
        `/api/webhooks/${webhookId}/url`
      );
      return response;
    },
    enabled: !!webhookId && !isCreateMode,
  });

  const webhookUrl = webhookUrlData?.url || "";

  // Form setup - use different schemas for create vs edit
  const form = useForm<CreateWebhookFormValues | UpdateWebhookFormValues>({
    resolver: zodResolver(
      isCreateMode ? createWebhookFormSchema : updateWebhookFormSchema
    ),
    defaultValues: isCreateMode
      ? {
          name: "",
          description: "",
          source: "generic" as const,
          secret: "",
        }
      : {
          name: "",
          description: "",
          source: "generic" as const,
          // Don't include secret in default values - only set it when user edits
          config: {
            name: "",
            mappings: [
              {
                spec_type_id: "",
                workflow_definition_id: "",
                conditions: [],
              },
            ],
            default_action: undefined,
          },
        },
  });

  const { reset, formState } = form;

  // Populate form when webhook loads (edit mode only)
  useEffect(() => {
    if (webhook && !isCreateMode) {
      reset(webhookToFormValues(webhook));
    }
  }, [webhook, reset, isCreateMode]);

  // Handle form submission
  const onSubmit = async (
    data: CreateWebhookFormValues | UpdateWebhookFormValues
  ) => {
    if (isCreateMode) {
      // Create mode - data is CreateWebhookFormValues
      createMutation.mutate(data as CreateWebhookFormValues);
    } else {
      // Edit mode - data is UpdateWebhookFormValues
      if (!webhookId) return;
      updateMutation.mutate({
        webhookId: webhookId!,
        data: data as UpdateWebhookFormValues,
      });
    }
  };

  if (!projectId) {
    return <div>Invalid route parameters</div>;
  }

  // Loading state (only in edit mode)
  if (!isCreateMode && (isLoadingWebhook || isLoadingTestEvent)) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Webhook not found (edit mode only)
  if (!isCreateMode && !webhook) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-semibold">Webhook not found</h1>
          <Button
            className="mt-4"
            onClick={() =>
              navigate(`/projects/${projectId}/workflows/triggers`)
            }
          >
            Back to Webhooks
          </Button>
        </div>
      </div>
    );
  }

  const hasTestEvent = !!testEvent;
  const isDirty = formState.isDirty;

  return (
    <FormProvider {...form}>
      <div className="flex h-full flex-col">
        <PageHeader
          breadcrumbs={[
            { label: "Project", href: `/projects/${projectId}` },
            { label: "Workflows", href: `/projects/${projectId}/workflows` },
            {
              label: "Triggers",
              href: `/projects/${projectId}/workflows/triggers`,
            },
            {
              label: isCreateMode ? "Create" : webhook?.name || "Edit",
            },
          ]}
          title={
            isCreateMode ? "New Webhook Trigger" : "Configure Webhook Trigger"
          }
          description={
            !isCreateMode && webhook
              ? `${webhook.name} - ${webhook.status}`
              : undefined
          }
        />

        <div className="flex-1 overflow-auto px-6 py-4 space-y-6">
          {/* Form */}
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Single Card with All Sections */}
            <div className="space-y-6 p-4 sm:p-6 bg-card rounded-lg border">
              {/* Basic Info Section - Always visible */}
              <div className="space-y-4">
                <WebhookBasicInfoSection
                  control={form.control}
                  webhookUrl={isCreateMode ? "" : webhookUrl}
                  webhookSecret={isCreateMode ? "" : webhook!.secret}
                  currentSource={isCreateMode ? "generic" : webhook!.source}
                  isEditMode={!isCreateMode}
                />
              </div>

              {/* Locked sections until test event */}
              {!isCreateMode && !hasTestEvent && (
                <div className="pt-6 border-t">
                  <div className="text-center py-8">
                    <p className="text-sm font-medium">
                      Waiting for test event
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Send a test webhook to unlock configuration sections
                    </p>
                  </div>
                </div>
              )}

              {/* Unlocked sections after test event */}
              {!isCreateMode && hasTestEvent && (
                <div className="space-y-6 pt-6 border-t">
                  <WebhookMappingsSection
                    testPayload={
                      (testEvent?.payload as Record<string, unknown>) || null
                    }
                    locked={false}
                  />
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  navigate(`/projects/${projectId}/workflows/triggers`)
                }
              >
                Cancel
              </Button>

              <Button
                type="submit"
                disabled={
                  (isCreateMode ? false : !isDirty) ||
                  (isCreateMode
                    ? createMutation.isPending
                    : updateMutation.isPending)
                }
              >
                {(isCreateMode
                  ? createMutation.isPending
                  : updateMutation.isPending) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {isCreateMode ? "Create" : "Save"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </FormProvider>
  );
}
