#!/usr/bin/env tsx
/**
 * ⚠️ IMPORTANT: Gemini CLI Limitation Demonstration
 *
 * This example demonstrates that Gemini CLI does NOT support session continuation.
 * Unlike Claude and Codex, Gemini creates a NEW session on every execution.
 * Context is NOT maintained across multiple execute() calls.
 *
 * This is a fundamental limitation of the Gemini CLI at this time.
 *
 * Key Differences from Claude/Codex:
 * - sessionId parameter is tracked by SDK but ignored by Gemini CLI
 * - resume parameter is ignored by Gemini CLI
 * - Each call gets a completely fresh session with no history
 * - Gemini cannot remember information from previous calls
 */

import { execute } from '../../src/index';
import { randomUUID } from 'crypto';

async function main() {
  console.log('=== Gemini Session Limitation Demonstration ===\n');
  console.log('⚠️  Note: This example shows that Gemini does NOT support session continuation\n');

  // Generate a UUID for tracking (SDK uses this, but Gemini CLI ignores it)
  const sessionId = randomUUID();
  console.log('SDK Tracking ID:', sessionId);
  console.log('(Note: Gemini CLI will ignore this and create its own session)\n');

  // Step 1: Start a "session" and tell Gemini our name
  console.log('Step 1: Telling Gemini our name...\n');

  const result1 = await execute({
    tool: 'gemini',
    prompt: 'Hi! My name is Tony. Please remember that.',
    sessionId, // SDK tracks this, but Gemini creates its own
    verbose: false,
  });

  console.log("Gemini's response:");
  console.log(result1.data);
  console.log('\n---');
  console.log('Gemini Session ID:', result1.sessionId);
  console.log('Success:', result1.success);
  console.log('Duration:', result1.duration, 'ms');

  // Step 2: Try to "resume" and ask for our name
  // This will FAIL because Gemini creates a NEW session
  console.log('\n\nStep 2: Attempting to "resume" and asking what our name is...\n');
  console.log('⚠️  Expected behavior: Gemini will NOT remember because it creates a new session\n');

  const result2 = await execute({
    tool: 'gemini',
    prompt: 'What is my name?',
    sessionId: result1.sessionId, // Try to use previous session (will be ignored)
    resume: true, // This flag is ignored by Gemini CLI
    verbose: false,
  });

  console.log("Gemini's response:");
  console.log(result2.data);
  console.log('\n---');
  console.log('Gemini Session ID:', result2.sessionId);
  console.log('Success:', result2.success);
  console.log('Duration:', result2.duration, 'ms');

  // Verification
  console.log('\n\n=== Verification ===');
  console.log('First call session ID: ', result1.sessionId);
  console.log('Second call session ID:', result2.sessionId);
  console.log('Session IDs are different?', result1.sessionId !== result2.sessionId);

  if (result1.sessionId !== result2.sessionId) {
    console.log('\n✓ Confirmed: Gemini creates a NEW session on each execution');
  }

  console.log('\n=== Summary ===');
  console.log('Gemini CLI Limitation: NO session continuation support');
  console.log('- Each execute() call creates a fresh session');
  console.log('- Context is NOT maintained across calls');
  console.log('- The sessionId and resume parameters are ignored');
  console.log('- Gemini cannot remember previous conversation context');
  console.log('\nFor session continuation, use Claude or Codex instead.');
}

main().catch(console.error);
