import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/client/components/ui/button";
import { useWebhook } from "./hooks/useWebhook";
import { useRecentTestEvent } from "./hooks/useRecentTestEvent";
import { useWebhookMutations } from "./hooks/useWebhookMutations";
import { useWebhookWebSocket } from "./hooks/useWebhookWebSocket";
import {
  createWebhookFormSchema,
  updateWebhookFormSchema,
  type CreateWebhookFormValues,
  type UpdateWebhookFormValues,
} from "./schemas/webhook.schemas";
import type { Webhook } from "./types/webhook.types";
import { WebhookBasicInfoSection } from "./components/form-sections/WebhookBasicInfoSection";
import { WebhookMappingsSection } from "./components/form-sections/WebhookMappingsSection";

/**
 * Convert Webhook to form values
 */
function webhookToFormValues(webhook: Webhook): UpdateWebhookFormValues {
  return {
    name: webhook.name,
    description: webhook.description || undefined,
    workflow_identifier: webhook.workflow_identifier || undefined,
    config: webhook.config || {
      name: "Webhook Run",
      mappings: [
        {
          spec_type_id: "",
          workflow_id: "",
          conditions: [],
        },
      ],
    },
    // Don't include secret - let it remain undefined so form detects changes
  };
}

export default function WebhookFormPage() {
  const { id: projectId, webhookId } = useParams<{
    id: string;
    webhookId: string;
  }>();
  const navigate = useNavigate();

  // Determine if this is create or edit mode
  const isCreateMode = !webhookId;

  // Hooks - only fetch if in edit mode
  const { data: webhook, isLoading: isLoadingWebhook } = useWebhook(webhookId);
  const { data: testEvent, isLoading: isLoadingTestEvent } =
    useRecentTestEvent(webhookId);
  const { createMutation, updateMutation, activateMutation } =
    useWebhookMutations(projectId!);

  // WebSocket for real-time updates (only in edit mode)
  useWebhookWebSocket(projectId!, webhookId);

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
          workflow_identifier: "",
          config: {
            name: "Webhook Run",
            mappings: [
              {
                spec_type_id: "",
                workflow_id: "",
                conditions: [],
              },
            ],
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

  // Handle activate
  const handleActivate = async () => {
    if (!webhookId || !webhook) return;

    // Validate workflow exists
    if (!webhook.workflow_identifier) {
      alert("Please select a workflow before activating");
      return;
    }

    activateMutation.mutate({ webhookId: webhookId! });
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
            onClick={() => navigate(`/projects/${projectId}/webhooks`)}
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
      <div className="container mx-auto max-w-4xl px-4 sm:px-6 md:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold">
            {isCreateMode ? "Create Webhook" : "Configure Webhook"}
          </h1>
          {!isCreateMode && webhook && (
            <p className="text-sm text-muted-foreground">
              {webhook.name} - {webhook.status}
            </p>
          )}
        </div>

        {/* Form */}
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          {/* Single Card with All Sections */}
          <div className="space-y-6 p-4 sm:p-6 bg-card rounded-lg border">
            {/* Basic Info Section - Always visible */}
            <div className="space-y-4">
              <WebhookBasicInfoSection
                control={form.control}
                webhookUrl={
                  isCreateMode
                    ? ""
                    : `${window.location.origin}/api/webhooks/${webhook!.id}/events`
                }
                webhookSecret={isCreateMode ? "" : webhook!.secret}
                currentSource={isCreateMode ? "generic" : webhook!.source}
                isEditMode={!isCreateMode}
              />
            </div>

            {/* Locked sections until test event */}
            {!isCreateMode && !hasTestEvent && (
              <div className="pt-6 border-t">
                <div className="text-center py-8">
                  <p className="text-sm font-medium">Waiting for test event</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Send a test webhook to unlock configuration sections
                  </p>
                </div>
              </div>
            )}

            {/* Unlocked sections after test event */}
            {!isCreateMode && hasTestEvent && (
              <div className="space-y-4 pt-6 border-t">
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
              onClick={() => navigate(`/projects/${projectId}/webhooks`)}
            >
              Cancel
            </Button>

            <div className="flex gap-2">
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

              {webhook?.status === "draft" && hasTestEvent && (
                <Button
                  type="button"
                  onClick={handleActivate}
                  disabled={activateMutation.isPending}
                >
                  {activateMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Activate
                </Button>
              )}
            </div>
          </div>
        </form>
      </div>
    </FormProvider>
  );
}
