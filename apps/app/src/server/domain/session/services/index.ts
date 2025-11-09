// Session CRUD operations
export { getSessions } from './getSessions';
export { getSessionsByProject } from './getSessionsByProject';
export { getSessionById } from './getSessionById';
export { getSessionMessages } from './getSessionMessages';
export { createSession } from './createSession';
export { updateSessionName } from './updateSessionName';
export { updateSessionMetadata } from './updateSessionMetadata';
export { updateSession } from './updateSession';
export { updateSessionState } from './updateSessionState';
export { archiveSession } from './archiveSession';
export { unarchiveSession } from './unarchiveSession';

// Session sync operations
export { syncProjectSessions } from './syncProjectSessions';
export { parseJSONLFile } from './parseJSONLFile';

// WebSocket operations
export { executeAgent } from './executeAgent';
export { validateSessionOwnership } from './validateSessionOwnership';
export { extractUsageFromEvents } from './extractUsageFromEvents';
export { processImageUploads } from './processImageUploads';
export { cancelSession } from './cancelSession';
export { handleExecutionFailure } from './handleExecutionFailure';

// Session utilities
export { generateSessionName } from './generateSessionName';
export { storeCliSessionId } from './storeCliSessionId';
export { cleanupSessionImages } from './cleanupSessionImages';
export { validateAgentSupported } from './validateAgentSupported';
export { parseExecutionConfig } from './parseExecutionConfig';

// Re-export types for convenience
export type {
  AgentExecuteConfig,
  AgentExecuteResult,
  UsageData,
  SessionWithProject,
  ImageProcessingResult,
  GenerateSessionNameOptions,
  ExecutionConfig,
  SessionUpdateData,
} from '../types/index';
