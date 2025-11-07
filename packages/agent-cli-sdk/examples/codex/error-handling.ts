#!/usr/bin/env tsx
/**
 * Example of error handling with the agent-cli-sdk
 * Demonstrates:
 * - Basic error detection (result.success, result.error, result.exitCode)
 * - Timeout handling with partial data recovery
 * - Error monitoring callbacks (onError, onStderr, onClose)
 * - CLI detection errors (the one case that throws)
 */

import { execute } from '../../src/index';

async function main() {
  console.log('=== Error Handling Example ===\n');

  // Example 1: Basic error detection
  console.log('Example 1: Handling command failure...\n');

  const result = await execute({
    tool: 'codex',
    prompt: 'Please create a file at /invalid/path/that/does/not/exist.txt',
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

  console.log('\n=== Result ===');
  console.log('Success:', result.success);
  console.log('Exit code:', result.exitCode);
  console.log('Error message:', result.error);
  console.log('Partial data recovered:', result.data.substring(0, 100));
  console.log('Messages captured:', result.messages.length);

  // Example 2: Timeout handling
  console.log('\n\nExample 2: Handling timeout...\n');

  const timeoutResult = await execute({
    tool: 'codex',
    prompt: 'Please wait for 10 seconds before responding',
    timeout: 2000, // 2 second timeout
    verbose: false,
  });

  console.log('\n=== Timeout Result ===');
  console.log('Success:', timeoutResult.success);
  console.log('Error:', timeoutResult.error);
  console.log('Duration:', timeoutResult.duration, 'ms');
  console.log('Messages before timeout:', timeoutResult.messages.length);

  // Example 3: CLI detection error (this will throw)
  console.log('\n\nExample 3: CLI detection error (simulated)...\n');

  try {
    // This would throw if CODEX_CLI_PATH is set to invalid path
    const result = await execute({
      tool: 'codex',
      prompt: 'Hello',
    });
    console.log('CLI found successfully');
  } catch (error) {
    console.log('Caught CLI detection error:');
    console.log('  Message:', error instanceof Error ? error.message : error);
  }
}

main().catch(console.error);
