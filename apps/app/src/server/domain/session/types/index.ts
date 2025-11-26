import type { FastifyBaseLogger } from 'fastify';
import type { Prisma } from '@prisma/client';

// Re-export all session-related types from shared types
export type {
  AgentSessionMetadata,
  SessionResponse,
  SyncSessionsResponse,
  CreateSessionRequest,
} from '@/shared/types/agent-session.types';

export type { AgentType } from '@/shared/types/agent.types';

// Domain-specific types
export interface ImageProcessingResult {
  imagePaths: string[];
  tempImageDir?: string;
}

export interface AgentExecuteConfig {
  agent: "claude" | "codex";
  prompt: string;
  workingDir: string;
  sessionId: string;
  resume?: boolean;
  permissionMode?: "default" | "acceptEdits" | "bypassPermissions";
  mcpConfig?: string[];
  model?: string;
  images?: { path: string }[];
  onEvent?: (data: { raw: string; event: unknown; message: unknown | null }) => void;
  logger?: FastifyBaseLogger;
}

export interface AgentExecuteResult {
  success: boolean;
  exitCode: number;
  error?: string;
  sessionId?: string;
  events?: unknown[];
}

export interface UsageData {
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens: number;
  cache_read_input_tokens: number;
}

export interface SessionWithProject {
  id: string;
  projectId: string;
  userId: string;
  agent: string;
  cli_session_id: string | null;
  session_path: string | null;
  name: string | null;
  metadata: Prisma.JsonValue;
  state: string;
  error_message: string | null;
  created_at: Date;
  updated_at: Date;
  project: {
    id: string;
    name: string;
    path: string;
    userId: string;
    created_at: Date;
    updated_at: Date;
    hidden: boolean;
    starred: boolean;
  };
}

/**
 * Execution configuration for agent commands
 */
export interface ExecutionConfig {
  resume: boolean;
  permissionMode: "default" | "acceptEdits" | "bypassPermissions" | undefined;
  model: string | undefined;
}

/**
 * Partial session update data
 */
export type SessionUpdateData = Partial<{
  id: string;
  projectId: string;
  userId: string;
  agent: string;
  cli_session_id: string | null;
  session_path: string | null;
  name: string | null;
  metadata: Prisma.JsonValue;
  state: string;
  error_message: string | null;
  created_at: Date;
  updated_at: Date;
}>;

// Service Options Types (NEW - Refactored Service API)
// CRUD Operations (use { data } wrapper)
export * from './CreateSessionOptions';
export * from './UpdateSessionOptions';
export * from './UpdateSessionNameOptions';
export * from './UpdateSessionMetadataOptions';
export * from './UpdateSessionStateOptions';

// Query Operations (use { filters } wrapper)
export * from './GetSessionsByProjectOptions';

// Action Operations (flat parameters)
export * from './CancelSessionOptions';
export * from './GetSessionMessagesOptions';
export * from './StoreCliSessionIdOptions';
export * from './ArchiveSessionOptions';
export * from './UnarchiveSessionOptions';
export * from './ParseJSONLFileOptions';
export * from './ValidateSessionOwnershipOptions';
export * from './ValidateAgentSupportedOptions';
export * from './SyncProjectSessionsOptions';
export * from './GenerateSessionNameOptions';
export * from './ExtractUsageFromEventsOptions';
export * from './CleanupSessionImagesOptions';
export * from './HandleExecutionFailureOptions';
export * from './ProcessImageUploadsOptions';
export * from './ParseExecutionConfigOptions';
