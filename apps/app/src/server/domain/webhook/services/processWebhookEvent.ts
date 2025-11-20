import type { WebhookProcessingResult } from "../types/webhook.types";
import { getWebhookById } from "./getWebhookById";
import { validateWebhookSignature } from "./validateWebhookSignature";
import { mapPayloadToWorkflowRun } from "./mapPayloadToWorkflowRun";
import { createWebhookEvent } from "./createWebhookEvent";
import { markWebhookError } from "./markWebhookError";
import { renderTemplate } from "./renderTemplate";
import { getWorkflowDefinitionBy } from "../../workflow/services/definitions/getWorkflowDefinitionBy";
import { createWorkflowRun } from "../../workflow/services/runs/createWorkflowRun";
import { getProjectById } from "../../project/services/getProjectById";
import { prisma } from "@/shared/prisma";
import { broadcast } from "@/server/websocket/infrastructure/subscriptions";
import { Channels } from "@/shared/websocket";
import { WebhookEventTypes } from "@/shared/types/websocket.types";
import type { WebhookSource } from "@prisma/client";

// ============================================================================
// PUBLIC API
// ============================================================================

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

    // 4. Get project to determine user_id
    const project = await getProjectById({ id: webhook.project_id });
    if (!project) {
      throw new Error(`Project ${webhook.project_id} not found`);
    }

    // Get first user from DB (in production, this should be configurable per webhook)
    const user = await prisma.user.findFirst();
    if (!user) {
      throw new Error("No users found in system");
    }

    // 5. Map payload to workflow run fields using unified mappings
    const mappingResult = mapPayloadToWorkflowRun(payload, webhook.config);

    // Check if mapping returned null (default_action: "skip")
    if (!mappingResult) {
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

    const { mapping, debugInfo } = mappingResult;
    mappedData = { ...mapping, debug: debugInfo };

    // 6. Lookup workflow definition
    const workflowDefinition = await getWorkflowDefinitionBy({
      where: {
        project_id: webhook.project_id,
        id: mapping.workflow_id,
      },
    });

    if (!workflowDefinition) {
      // Mark webhook as error
      const errorMsg = `Workflow '${mapping.workflow_id}' not found`;
      await markWebhookError(webhookId, errorMsg);

      eventStatus = "failed";
      errorMessage = errorMsg;

      const event = await createWebhookEvent({
        webhook_id: webhookId,
        status: eventStatus,
        payload,
        headers,
        error_message: errorMessage,
        mapped_data: mappedData,
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

    // 7. Create webhook event first to get event ID
    eventStatus = "success";
    const event = await createWebhookEvent({
      webhook_id: webhookId,
      status: eventStatus,
      payload,
      headers,
      mapped_data: mappedData,
      processing_time_ms: Date.now() - startTime,
    });

    // 8. Extract issue info and branch name from payload
    const issueInfo = extractIssueInfo(payload, webhook.source);

    // 9. Create workflow run with trigger, issue info, and worktree mode
    const workflowRun = await createWorkflowRun({
      project_id: webhook.project_id,
      user_id: user.id,
      workflow_definition_id: workflowDefinition.id,
      name: renderTemplate(webhook.config.name, payload),
      args: {},
      spec_type: mapping.spec_type_id,
      spec_content: webhook.config.spec_content,
      triggered_by: 'webhook',
      webhook_event_id: event.id,
      issue_id: issueInfo.issue_id,
      issue_url: issueInfo.issue_url,
      issue_source: issueInfo.issue_source,
      mode: 'worktree',
      base_branch: 'main',
      branch_name: issueInfo.branch_name,
    });

    if (!workflowRun) {
      throw new Error("Failed to create workflow run");
    }

    workflowRunId = workflowRun.id;

    // 10. Workflow execution will be triggered automatically by workflow engine
    // The WorkflowRun is created with status='pending' which triggers execution

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

// ============================================================================
// PRIVATE HELPERS
// ============================================================================

/**
 * Extract issue information and branch name from webhook payload based on source
 * Returns issue_id, issue_url, issue_source, and auto-generated branch_name
 */
function extractIssueInfo(
  payload: Record<string, unknown>,
  source: WebhookSource,
): {
  issue_id: string | undefined;
  issue_url: string | undefined;
  issue_source: 'github' | 'linear' | 'jira' | 'generic';
  branch_name: string | undefined;
} {
  let issue_id: string | undefined;
  let issue_url: string | undefined;
  let branch_name: string | undefined;
  const issue_source = source as 'github' | 'linear' | 'jira' | 'generic';

  switch (source) {
    case 'github': {
      // GitHub: extract from pull_request or issue
      const pr = payload.pull_request as Record<string, unknown> | undefined;
      const issue = payload.issue as Record<string, unknown> | undefined;

      if (pr) {
        issue_id = `#${pr.number}`;
        issue_url = pr.html_url as string | undefined;
        branch_name = `github-${pr.number}`;
      } else if (issue) {
        issue_id = `#${issue.number}`;
        issue_url = issue.html_url as string | undefined;
        branch_name = `github-${issue.number}`;
      }
      break;
    }

    case 'linear': {
      // Linear: extract from data.identifier, url, and branchName
      const data = payload.data as Record<string, unknown> | undefined;
      if (data) {
        issue_id = data.identifier as string | undefined;
        issue_url = data.url as string | undefined;
        // Linear provides pre-formatted branch name (e.g., "jnarowski-plt-1084-test-hey-jp-test-good")
        branch_name = data.branchName as string | undefined;
      }
      break;
    }

    case 'jira': {
      // Jira: extract from issue.key and self URL
      const issue = payload.issue as Record<string, unknown> | undefined;
      if (issue) {
        issue_id = issue.key as string | undefined;
        // Construct URL from self (e.g., https://your-domain.atlassian.net/rest/api/2/issue/10001)
        const self = issue.self as string | undefined;
        if (self) {
          // Convert API URL to browse URL
          issue_url = self.replace('/rest/api/2/issue/', '/browse/');
        }
        // Use Jira key as branch name (e.g., "PROJ-456" → "proj-456")
        branch_name = issue_id?.toLowerCase();
      }
      break;
    }

    case 'generic':
    default: {
      // Generic: try to extract from common fields
      issue_id = (payload.id || payload.identifier || payload.number) as string | undefined;
      issue_url = (payload.url || payload.html_url || payload.link) as string | undefined;
      // Fallback branch name from ID
      branch_name = issue_id ? `webhook-${issue_id}` : undefined;
      break;
    }
  }

  return { issue_id, issue_url, issue_source, branch_name };
}
