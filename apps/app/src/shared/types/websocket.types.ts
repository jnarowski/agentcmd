/**
 * Shared WebSocket Type Definitions
 *
 * This file defines the core types for our Phoenix Channels-based WebSocket architecture.
 * All event types, constants, and data interfaces are defined here and shared between
 * frontend and backend to ensure type parity.
 */

// ============================================================================
// Base Types
// ============================================================================

/**
 * WebSocket ready states (matching browser WebSocket API)
 */
export enum ReadyState {
  CONNECTING = 0,
  OPEN = 1,
  CLOSING = 2,
  CLOSED = 3,
}

/**
 * Base channel event structure with discriminated union support
 */
export interface ChannelEvent<T = string, D = unknown> {
  type: T;
  data: D;
}

// ============================================================================
// Session Events
// ============================================================================

/**
 * Session event type constants
 * Used for session:* channels (agent streaming, message handling)
 * Events use dot notation for hierarchical naming
 */
export const SessionEventTypes = {
  CANCEL: "session.cancel",
  ERROR: "session.error",
  MESSAGE_COMPLETE: "session.message_complete",
  SEND_MESSAGE: "session.send_message",
  SESSION_UPDATED: "session.session_updated",
  STREAM_OUTPUT: "session.stream_output",
  SUBSCRIBE: "session.subscribe",
  SUBSCRIBE_SUCCESS: "session.subscribe_success",
} as const;

/**
 * Data interfaces for session events
 */
import type { UnifiedMessage } from 'agent-cli-sdk';

export interface StreamOutputData {
  message: UnifiedMessage;
  sessionId: string;
  timestamp?: number;
}

export interface MessageCompleteData {
  sessionId: string;
  messageId?: string;
  timestamp?: number;
  usage?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    cacheCreationTokens?: number;
    cacheReadTokens?: number;
  };
  metadata?: Record<string, unknown>;
  session?: import('./agent-session.types').SessionResponse; // Full session for Zustand direct updates
}

export interface SessionErrorData {
  error: string;
  message?: string; // Alias for error (backwards compat)
  sessionId: string;
  code?: string;
  timestamp?: number;
}

export interface SubscribeSuccessData {
  channel: string;
  timestamp?: number;
}

export interface SessionUpdatedData {
  sessionId: string;
  state?: 'idle' | 'working' | 'error';
  error_message?: string | null;
  metadata?: Record<string, unknown>;
  name?: string;
  updated_at?: Date | string;
  session?: import('./agent-session.types').SessionResponse; // Full session for Zustand direct updates
}

/**
 * Discriminated union for all session events
 * Enables exhaustive type checking with TypeScript's never type
 */
export type SessionEvent =
  | {
      type: typeof SessionEventTypes.STREAM_OUTPUT;
      data: StreamOutputData;
    }
  | {
      type: typeof SessionEventTypes.MESSAGE_COMPLETE;
      data: MessageCompleteData;
    }
  | {
      type: typeof SessionEventTypes.ERROR;
      data: SessionErrorData;
    }
  | {
      type: typeof SessionEventTypes.SUBSCRIBE_SUCCESS;
      data: SubscribeSuccessData;
    }
  | {
      type: typeof SessionEventTypes.SESSION_UPDATED;
      data: SessionUpdatedData;
    };

// ============================================================================
// Global Events
// ============================================================================

/**
 * Global event type constants
 * Used for global channel (connection, heartbeat, subscriptions)
 * Events use dot notation for hierarchical naming
 */
export const GlobalEventTypes = {
  CONNECTED: "global.connected",
  ERROR: "global.error",
  PING: "global.ping",
  PONG: "global.pong",
  SUBSCRIPTION_SUCCESS: "global.subscription_success",
  SUBSCRIPTION_ERROR: "global.subscription_error",
} as const;

/**
 * Data interfaces for global events
 */
export interface ConnectedData {
  timestamp: number;
  clientId?: string;
}

export interface GlobalErrorData {
  error: string;
  code?: string;
  timestamp?: number;
}

export interface PingData {
  timestamp: number;
}

export interface PongData {
  timestamp: number;
}

export interface SubscriptionSuccessData {
  channel: string;
  timestamp?: number;
}

export interface SubscriptionErrorData {
  channel: string;
  error: string;
  timestamp?: number;
}

/**
 * Discriminated union for all global events
 */
export type GlobalEvent =
  | {
      type: typeof GlobalEventTypes.CONNECTED;
      data: ConnectedData;
    }
  | {
      type: typeof GlobalEventTypes.ERROR;
      data: GlobalErrorData;
    }
  | {
      type: typeof GlobalEventTypes.PING;
      data: PingData;
    }
  | {
      type: typeof GlobalEventTypes.PONG;
      data: PongData;
    }
  | {
      type: typeof GlobalEventTypes.SUBSCRIPTION_SUCCESS;
      data: SubscriptionSuccessData;
    }
  | {
      type: typeof GlobalEventTypes.SUBSCRIPTION_ERROR;
      data: SubscriptionErrorData;
    };

// ============================================================================
// Shell Events
// ============================================================================

/**
 * Shell event type constants
 * Used for shell:* channels (terminal PTY streams)
 * Events use dot notation for hierarchical naming
 *
 * Note: Shell WebSocket uses a separate connection from session WebSocket
 * See .agent/docs/websockets.md for architectural rationale
 */
export const ShellEventTypes = {
  INIT: "shell.init",
  INPUT: "shell.input",
  OUTPUT: "shell.output",
  RESIZE: "shell.resize",
  EXIT: "shell.exit",
  ERROR: "shell.error",
} as const;

/**
 * Data interfaces for shell events
 */
export interface ShellInitData {
  shellId: string;
  rows: number;
  cols: number;
  timestamp?: number;
}

export interface ShellInputData {
  shellId: string;
  data: string;
}

export interface ShellOutputData {
  shellId: string;
  data: string;
}

export interface ShellResizeData {
  shellId: string;
  rows: number;
  cols: number;
}

export interface ShellExitData {
  shellId: string;
  code: number;
  timestamp?: number;
}

export interface ShellErrorData {
  shellId: string;
  error: string;
  code?: string;
  timestamp?: number;
}

/**
 * Discriminated union for all shell events
 */
export type ShellEvent =
  | {
      type: typeof ShellEventTypes.INIT;
      data: ShellInitData;
    }
  | {
      type: typeof ShellEventTypes.INPUT;
      data: ShellInputData;
    }
  | {
      type: typeof ShellEventTypes.OUTPUT;
      data: ShellOutputData;
    }
  | {
      type: typeof ShellEventTypes.RESIZE;
      data: ShellResizeData;
    }
  | {
      type: typeof ShellEventTypes.EXIT;
      data: ShellExitData;
    }
  | {
      type: typeof ShellEventTypes.ERROR;
      data: ShellErrorData;
    };

// ============================================================================
// Workflow Events
// ============================================================================

/**
 * Workflow WebSocket event type constants
 *
 * Hierarchical event naming with dot notation
 * - workflow.run.updated - Status, phase, error changes
 * - workflow.run.step.updated - Step status, logs, error changes
 * - workflow.run.event.created - WorkflowEvent created (annotations, etc.)
 * - workflow.run.artifact.created - WorkflowArtifact uploaded/attached
 *
 * All events broadcast to project:${projectId} room only
 * Client-side filtering handled efficiently by React Query cache
 */
export const WorkflowWebSocketEventTypes = {
  RUN_UPDATED: "workflow.run.updated",
  STEP_UPDATED: "workflow.run.step.updated",
  STEP_LOG_CHUNK: "workflow.run.step.log_chunk",
  EVENT_CREATED: "workflow.run.event.created",
  ARTIFACT_CREATED: "workflow.run.artifact.created",
} as const;

/**
 * Data interfaces for workflow WebSocket events
 */

import type { WorkflowStatus, StepStatus } from '../schemas/workflow.schemas';

/**
 * Run updated event - partial updates to WorkflowRun
 * Contains only changed fields to minimize payload size
 */
export interface WorkflowRunUpdatedData {
  run_id: string;
  project_id: string;
  changes: Partial<{
    status: WorkflowStatus;
    current_phase: string | null;
    current_step: string | null;
    error_message: string | null;
    started_at: Date | string;
    completed_at: Date | string;
    updated_at: Date | string;
  }>;
}

/**
 * Step updated event - partial updates to WorkflowRunStep
 * Contains only changed fields
 */
export interface WorkflowStepUpdatedData {
  run_id: string;
  step_id: string;
  changes: Partial<{
    status: StepStatus;
    logs: string | null;
    error_message: string | null;
    started_at: Date | string;
    completed_at: Date | string;
    updated_at: Date | string;
    agent_session_id: string | null;
  }>;
}

/**
 * Step log chunk event - real-time log streaming during step execution
 */
export interface WorkflowStepLogChunkData {
  run_id: string;
  step_id: string;
  chunk: string;
  timestamp: Date | string;
}

/**
 * Event created - full WorkflowEvent object
 * Sent when annotation or other event is created
 */
export interface WorkflowEventCreatedData {
  run_id: string;
  event: {
    id: string;
    workflow_run_id: string;
    event_type: string;
    event_data: unknown;
    phase: string | null;
    inngest_step_id: string | null;
    created_by_user_id: string | null;
    created_at: Date | string;
  };
}

/**
 * Artifact created - full WorkflowArtifact object
 * Sent when artifact uploaded or attached to event
 */
export interface WorkflowArtifactCreatedData {
  run_id: string;
  artifact: {
    id: string;
    workflow_run_id: string;
    workflow_event_id: string | null;
    name: string;
    file_path: string;
    file_type: string;
    mime_type: string;
    size_bytes: number;
    phase: string | null;
    inngest_step_id: string | null;
    created_at: Date | string;
  };
}

/**
 * Discriminated union for all workflow WebSocket events
 * Enables exhaustive type checking with TypeScript's never type
 */
export type WorkflowWebSocketEvent =
  | {
      type: typeof WorkflowWebSocketEventTypes.RUN_UPDATED;
      data: WorkflowRunUpdatedData;
    }
  | {
      type: typeof WorkflowWebSocketEventTypes.STEP_UPDATED;
      data: WorkflowStepUpdatedData;
    }
  | {
      type: typeof WorkflowWebSocketEventTypes.STEP_LOG_CHUNK;
      data: WorkflowStepLogChunkData;
    }
  | {
      type: typeof WorkflowWebSocketEventTypes.EVENT_CREATED;
      data: WorkflowEventCreatedData;
    }
  | {
      type: typeof WorkflowWebSocketEventTypes.ARTIFACT_CREATED;
      data: WorkflowArtifactCreatedData;
    };

// ============================================================================
// Webhook Events
// ============================================================================

/**
 * Webhook WebSocket event type constants
 *
 * Events use dot notation for hierarchical naming
 * - webhook.event_received - Webhook event received (test, success, filtered, failed)
 *
 * All events broadcast to project:${projectId} channel
 */
export const WebhookEventTypes = {
  EVENT_RECEIVED: "webhook.event_received",
} as const;

/**
 * Data interface for webhook event received
 */
export interface WebhookEventReceivedData {
  webhook_id: string;
  event: {
    id: string;
    status: "test" | "success" | "filtered" | "failed";
    created_at: Date | string;
  };
}

/**
 * Discriminated union for all webhook WebSocket events
 */
export type WebhookWebSocketEvent = {
  type: typeof WebhookEventTypes.EVENT_RECEIVED;
  data: WebhookEventReceivedData;
};

// ============================================================================
// Combined Types
// ============================================================================

/**
 * Union of all possible channel events
 * Useful for generic event handling
 */
export type AnyChannelEvent =
  | SessionEvent
  | GlobalEvent
  | ShellEvent
  | WorkflowWebSocketEvent
  | WebhookWebSocketEvent;

/**
 * WebSocket message format sent over the wire
 */
export interface WebSocketMessage {
  channel: string;
  type: string;
  data: unknown;
}
