/**
 * Agent Session Types
 * Shared type definitions for chat sessions with Claude Code
 */

import type { AgentType } from './agent.types';

/**
 * Session type enum
 */
export type SessionType = 'chat' | 'workflow';

/**
 * Session metadata stored in AgentSession.metadata JSON field
 */
export interface AgentSessionMetadata {
  totalTokens: number;
  messageCount: number;
  lastMessageAt: string; // ISO 8601 timestamp
  firstMessagePreview: string; // First user message preview (truncated to 100 chars)
  firstAssistantMessage?: string; // First assistant text response (truncated to 250 chars)
  createdAt?: string; // ISO 8601 timestamp from first JSONL entry
  isPlanSession?: boolean; // True if session contains Plan Task tool uses
}

/**
 * Request body for creating a new session
 */
export interface CreateSessionRequest {
  sessionId: string; // Pre-generated UUID
  agent?: AgentType; // Optional agent type (defaults to 'claude')
  permission_mode?: 'default' | 'plan' | 'acceptEdits' | 'bypassPermissions'; // Optional permission mode
}

/**
 * Session state enum
 */
export type SessionState = 'idle' | 'working' | 'error';

/**
 * Session response from API
 */
export interface SessionResponse {
  id: string;
  projectId: string;
  userId: string;
  name?: string; // AI-generated session name (optional for legacy sessions)
  agent: AgentType;
  type: SessionType;
  permission_mode: 'default' | 'plan' | 'acceptEdits' | 'bypassPermissions';
  cli_session_id?: string; // Session ID from CLI tool (Claude/Codex) - needed for loading/resuming sessions
  session_path?: string; // Full absolute path to session JSONL file (optional for legacy sessions)
  metadata: AgentSessionMetadata;
  state: SessionState; // Current execution state
  error_message?: string; // Error details when state is 'error'
  is_archived: boolean;
  archived_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

/**
 * Request to update session metadata
 */
export interface UpdateSessionMetadataRequest {
  metadata: Partial<AgentSessionMetadata>;
}

/**
 * Request to sync sessions for a project
 */
export interface SyncSessionsRequest {
  projectId: string;
}

/**
 * Sync sessions response
 */
export interface SyncSessionsResponse {
  synced: number; // Number of sessions synced from filesystem
  created: number; // Number of new sessions created
  updated: number; // Number of existing sessions updated
}
