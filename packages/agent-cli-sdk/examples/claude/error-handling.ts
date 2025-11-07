#!/usr/bin/env tsx
/**
 * Example of error handling and session resumption with the agent-cli-sdk
 * Demonstrates:
 * - Basic error detection (result.success, result.error, result.exitCode)
 * - Timeout handling with partial data recovery
 * - Session resumption after errors
 * - Error monitoring callbacks (onError, onStderr, onClose)
 * - CLI detection errors (the one case that throws)
 * - pnpm tsx examples/error-handling.ts
 */

import { execute } from '../../src/index';
import { randomUUID } from 'crypto';

async function main() {
  console.log('=== Error Handling & Session Resumption Example ===\n');

  const result = await execute({
    tool: 'claude',
    prompt: 'Never mind that. Just tell me what directory we are in right now.',
    sessionId: randomUUID(),
    resume: true,
    verbose: false,
    onError: (error: Error) => {
      console.log('[onError callback]:', error.message);
    },
    onStderr: (chunk: string) => {
      console.log('[onStderr callback]:', chunk);
    },
    onClose: (exitCode: number) => {
      console.log('[onClose callback]: Process closed with code', exitCode);
    },
  });

  console.log('Resumed execution result:');
  console.log(result);
}

main().catch(console.error);
