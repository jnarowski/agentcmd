#!/usr/bin/env tsx
/**
 * Example of using session continuation to maintain context across multiple executions
 * Demonstrates how Codex remembers information from previous messages in the same session
 * pnpm tsx packages/agent-cli-sdk/examples/codex/session-continuation.ts
 */

import { execute } from '../../src/index';

async function main() {
  console.log('=== Session Continuation Example ===\n');

  // Step 1: Start a new session and tell Codex our name
  console.log('Step 1: Starting new session and introducing ourselves...\n');

  const result1 = await execute({
    tool: 'codex',
    prompt: 'Hi! My name is Tony. Please remember that.',
    verbose: false,
  });

  console.log("Codex's response:");
  console.log(result1.data);
  console.log('\n---\n');
  console.log('Session ID:', result1.sessionId);
  console.log('Success:', result1.success);
  console.log('Duration:', result1.duration, 'ms');

  // Step 2: Resume the session and ask Codex to recall our name
  console.log('\n\nStep 2: Resuming the session and asking Codex what our name is...\n');

  const result2 = await execute({
    tool: 'codex',
    prompt: 'What is my name?',
    sessionId: result1.sessionId, // Use the thread ID from the first execution
    verbose: false,
  });

  console.log("Codex's response:");
  console.log(result2.data);
  console.log('\n---\n');
  console.log('Session ID:', result2.sessionId);
  console.log('Success:', result2.success);
  console.log('Duration:', result2.duration, 'ms');

  console.log('\n\n=== Summary ===');
  console.log('Both executions used the same session:', result1.sessionId);
  console.log('Codex maintained context across all messages!');
  console.log('Total messages across all calls:', result1.messages.length + result2.messages.length);
}

main().catch(console.error);
