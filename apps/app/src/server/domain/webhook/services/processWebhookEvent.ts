import type { WebhookProcessingResult, ConditionRule } from "../types/webhook.types";
import { getWebhookById } from "./getWebhookById";
import { validateWebhookSignature } from "./validateWebhookSignature";
import { evaluateConditions } from "./evaluateConditions";
import { mapPayloadToWorkflowRun } from "./mapPayloadToWorkflowRun";
import { createWebhookEvent } from "./createWebhookEvent";
import { markWebhookError } from "./markWebhookError";
import { getWorkflowDefinitionBy } from "../../workflow/services/definitions/getWorkflowDefinitionBy";
import { createWorkflowRun } from "../../workflow/services/runs/createWorkflowRun";
import { getProjectById } from "../../project/services/getProjectById";
import { prisma } from "@/shared/prisma";
import { broadcast } from "@/server/websocket/infrastructure/subscriptions";
import { Channels } from "@/shared/websocket";
import { WebhookEventTypes } from "@/shared/types/websocket.types";

// PUBLIC API

/**
 * Main webhook event processing orchestrator
 * Handles: signature validation → state check → conditions → mapping → run creation
 *
 * @param webhookId - Webhook ID
 * @param rawPayload - Raw request body (for signature validation)
 * @param payload - Parsed JSON payload
 * @param headers - Request headers
 * @returns Processing result
 *
 * @example
 * ```typescript
 * const result = await processWebhookEvent(
 *   "wh_123",
 *   '{"action":"opened"}',
 *   { action: "opened" },
 *   { "x-hub-signature-256": "sha256=..." }
 * );
 * // => { success: true, event_id: "evt_abc", workflow_run_id: "run_xyz", status: "success", ... }
 * ```
 */
export async function processWebhookEvent(
  webhookId: string,
  rawPayload: string,
  payload: Record<string, unknown>,
  headers: Record<string, string>,
): Promise<WebhookProcessingResult> {
  const startTime = Date.now();
  let eventStatus: WebhookProcessingResult["status"] = "test";
  let workflowRunId: string | undefined;
  let errorMessage: string | undefined;
  let mappedData: Record<string, unknown> | undefined;

  try {
    // 1. Get webhook
    const webhook = await getWebhookById(webhookId);
    if (!webhook) {
      throw new Error(`Webhook ${webhookId} not found`);
    }

    // 2. Validate signature
    const signatureResult = validateWebhookSignature(
      rawPayload,
      headers,
      webhook.secret,
      webhook.source,
      webhook.config,
    );

    if (!signatureResult.valid) {
      eventStatus = "invalid_signature";
      errorMessage = signatureResult.error;

      const event = await createWebhookEvent({
        webhook_id: webhookId,
        status: eventStatus,
        payload,
        headers,
        error_message: errorMessage,
        processing_time_ms: Date.now() - startTime,
      });

      // Emit WebSocket event
      broadcast(Channels.project(webhook.project_id), {
        type: WebhookEventTypes.EVENT_RECEIVED,
        data: {
          webhook_id: webhook.id,
          event: {
            id: event.id,
            status: event.status,
            created_at: event.created_at,
          },
        },
      });

      return {
        success: false,
        event_id: event.id,
        status: eventStatus,
        error_message: errorMessage,
        processing_time_ms: Date.now() - startTime,
      };
    }

    // 3. Check webhook status
    if (webhook.status === "draft" || webhook.status === "paused") {
      // Capture test event without triggering run
      eventStatus = "test";

      const event = await createWebhookEvent({
        webhook_id: webhookId,
        status: eventStatus,
        payload,
        headers,
        processing_time_ms: Date.now() - startTime,
      });

      // Update last_triggered_at
      await prisma.webhook.update({
        where: { id: webhookId },
        data: { last_triggered_at: new Date() },
      });

      // Emit WebSocket event
      broadcast(Channels.project(webhook.project_id), {
        type: WebhookEventTypes.EVENT_RECEIVED,
        data: {
          webhook_id: webhook.id,
          event: {
            id: event.id,
            status: event.status,
            created_at: event.created_at,
          },
        },
      });

      return {
        success: true,
        event_id: event.id,
        status: eventStatus,
        processing_time_ms: Date.now() - startTime,
      };
    }

    if (webhook.status === "error") {
      eventStatus = "error";
      errorMessage = "Webhook is in error state";

      const event = await createWebhookEvent({
        webhook_id: webhookId,
        status: eventStatus,
        payload,
        headers,
        error_message: errorMessage,
        processing_time_ms: Date.now() - startTime,
      });

      // Emit WebSocket event
      broadcast(Channels.project(webhook.project_id), {
        type: WebhookEventTypes.EVENT_RECEIVED,
        data: {
          webhook_id: webhook.id,
          event: {
            id: event.id,
            status: event.status,
            created_at: event.created_at,
          },
        },
      });

      return {
        success: false,
        event_id: event.id,
        status: eventStatus,
        error_message: errorMessage,
        processing_time_ms: Date.now() - startTime,
      };
    }

    // 4. Evaluate webhook-level conditions (if any)
    if (webhook.webhook_conditions) {
      if (!evaluateConditions(webhook.webhook_conditions as unknown as ConditionRule[], payload)) {
        eventStatus = "filtered";

        const event = await createWebhookEvent({
          webhook_id: webhookId,
          status: eventStatus,
          payload,
          headers,
          processing_time_ms: Date.now() - startTime,
        });

        await prisma.webhook.update({
          where: { id: webhookId },
          data: { last_triggered_at: new Date() },
        });

        // Emit WebSocket event
        broadcast(Channels.project(webhook.project_id), {
          type: WebhookEventTypes.EVENT_RECEIVED,
          data: {
            webhook_id: webhook.id,
            event: {
              id: event.id,
              status: event.status,
              created_at: event.created_at,
            },
          },
        });

        return {
          success: true,
          event_id: event.id,
          status: eventStatus,
          processing_time_ms: Date.now() - startTime,
        };
      }
    }

    // 5. Get project to determine user_id
    const project = await getProjectById({ id: webhook.project_id });
    if (!project) {
      throw new Error(`Project ${webhook.project_id} not found`);
    }

    // Get first user from DB (in production, this should be configurable per webhook)
    const user = await prisma.user.findFirst();
    if (!user) {
      throw new Error("No users found in system");
    }

    // 6. Lookup workflow definition
    if (!webhook.workflow_identifier) {
      throw new Error("Webhook missing workflow_identifier");
    }

    const workflowDefinition = await getWorkflowDefinitionBy({
      where: {
        project_id: webhook.project_id,
        identifier: webhook.workflow_identifier,
      },
    });

    if (!workflowDefinition) {
      // Mark webhook as error
      const errorMsg = `Workflow '${webhook.workflow_identifier}' not found`;
      await markWebhookError(webhookId, errorMsg);

      eventStatus = "failed";
      errorMessage = errorMsg;

      const event = await createWebhookEvent({
        webhook_id: webhookId,
        status: eventStatus,
        payload,
        headers,
        error_message: errorMessage,
        processing_time_ms: Date.now() - startTime,
      });

      // Emit WebSocket event
      broadcast(Channels.project(webhook.project_id), {
        type: WebhookEventTypes.EVENT_RECEIVED,
        data: {
          webhook_id: webhook.id,
          event: {
            id: event.id,
            status: event.status,
            created_at: event.created_at,
          },
        },
      });

      return {
        success: false,
        event_id: event.id,
        status: eventStatus,
        error_message: errorMessage,
        processing_time_ms: Date.now() - startTime,
      };
    }

    // 7. Map payload to workflow run data
    const runData = mapPayloadToWorkflowRun(
      payload,
      webhook.config.field_mappings,
      webhook.workflow_identifier,
      webhook.project_id,
      user.id,
    );

    mappedData = { ...runData.table_fields, args: runData.args };

    // 8. Create workflow run
    const workflowRun = await createWorkflowRun({
      project_id: runData.project_id,
      user_id: runData.user_id,
      workflow_definition_id: workflowDefinition.id,
      name: (runData.table_fields.name as string) || `Webhook: ${webhook.name}`,
      args: runData.args,
      spec_file: runData.table_fields.spec_file as string | undefined,
      spec_content: runData.table_fields.spec_content as string | undefined,
      spec_type: runData.table_fields.spec_type as string | undefined,
      mode: runData.table_fields.mode as string | undefined,
      branch_name: runData.table_fields.branch_name as string | undefined,
      base_branch: runData.table_fields.base_branch as string | undefined,
      planning_session_id: runData.table_fields.planning_session_id as
        | string
        | undefined,
    });

    if (!workflowRun) {
      throw new Error("Failed to create workflow run");
    }

    workflowRunId = workflowRun.id;

    // 9. Workflow execution will be triggered automatically by workflow engine
    // The WorkflowRun is created with status='pending' which triggers execution

    // 10. Create success event
    eventStatus = "success";

    const event = await createWebhookEvent({
      webhook_id: webhookId,
      workflow_run_id: workflowRunId,
      status: eventStatus,
      payload,
      headers,
      mapped_data: mappedData,
      processing_time_ms: Date.now() - startTime,
    });

    // Update last_triggered_at
    await prisma.webhook.update({
      where: { id: webhookId },
      data: { last_triggered_at: new Date() },
    });

    // Emit WebSocket event
    broadcast(Channels.project(webhook.project_id), {
      type: WebhookEventTypes.EVENT_RECEIVED,
      data: {
        webhook_id: webhook.id,
        event: {
          id: event.id,
          status: event.status,
          created_at: event.created_at,
        },
      },
    });

    return {
      success: true,
      event_id: event.id,
      workflow_run_id: workflowRunId,
      status: eventStatus,
      processing_time_ms: Date.now() - startTime,
    };
  } catch (error) {
    // Handle unexpected errors
    eventStatus = "failed";
    errorMessage = error instanceof Error ? error.message : "Unknown error";

    const event = await createWebhookEvent({
      webhook_id: webhookId,
      workflow_run_id: workflowRunId,
      status: eventStatus,
      payload,
      headers,
      mapped_data: mappedData,
      error_message: errorMessage,
      processing_time_ms: Date.now() - startTime,
    });

    // Emit WebSocket event
    const webhookForError = await getWebhookById(webhookId);
    if (webhookForError) {
      broadcast(Channels.project(webhookForError.project_id), {
        type: WebhookEventTypes.EVENT_RECEIVED,
        data: {
          webhook_id: webhookForError.id,
          event: {
            id: event.id,
            status: event.status,
            created_at: event.created_at,
          },
        },
      });
    }

    return {
      success: false,
      event_id: event.id,
      workflow_run_id: workflowRunId,
      status: eventStatus,
      error_message: errorMessage,
      processing_time_ms: Date.now() - startTime,
    };
  }
}
