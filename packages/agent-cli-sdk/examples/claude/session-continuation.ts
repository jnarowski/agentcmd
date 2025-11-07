#!/usr/bin/env tsx
/**
 * Example of using session continuation to maintain context across multiple executions
 * Demonstrates how Claude remembers information from previous messages in the same session
 */

import { execute } from '../../src/index';
import { randomUUID } from 'crypto';

async function main() {
  console.log('=== Session Continuation Example ===\n');

  // Generate a valid UUID for the session
  const sessionId = randomUUID();
  console.log('Using session ID:', sessionId, '\n');

  // Step 1: Start a new session and tell Claude our name
  console.log('Step 1: Starting new session and introducing ourselves...\n');

  const result1 = await execute({
    tool: 'claude',
    prompt: 'Hi! My name is Tony. Please remember that.',
    sessionId, // Use a valid UUID session ID
    verbose: false,
  });

  console.log("Claude's response:");
  console.log(result1.data);
  console.log('\n---\n');
  console.log('Session ID:', result1.sessionId);
  console.log('Success:', result1.success);
  console.log('Duration:', result1.duration, 'ms');

  // Step 2: Resume the session and ask Claude to recall our name
  console.log('\n\nStep 2: Resuming the session and asking Claude what our name is...\n');

  const result2 = await execute({
    tool: 'claude',
    prompt: 'What is my name?',
    sessionId: result1.sessionId, // Use the same session ID
    resume: true, // Resume the existing session with this ID
    verbose: false,
  });

  console.log("Claude's response:");
  console.log(result2.data);
  console.log('\n---\n');
  console.log('Session ID:', result2.sessionId);
  console.log('Success:', result2.success);
  console.log('Duration:', result2.duration, 'ms');

  console.log('\n\n=== Summary ===');
  console.log('All three executions used the same session:', result1.sessionId);
  console.log('Claude maintained context across all messages!');
  console.log('Total messages across all calls:', result1.messages.length + result2.messages.length);
}

main().catch(console.error);
