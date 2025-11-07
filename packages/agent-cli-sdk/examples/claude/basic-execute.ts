#!/usr/bin/env tsx
/**
 * Basic example of using execute() to run a simple Claude command
 */

import { execute } from '../../src/index';

async function main() {
  console.log('Running basic Claude command...\n');

  const result = await execute({
    tool: 'claude',
    prompt: 'What files are in the current directory? Just list them briefly.',
    verbose: true,
  });

  console.log('\n=== Result ===');
  console.log('Success:', result.success);
  console.log('Exit code:', result.exitCode);
  console.log('Session ID:', result.sessionId);
  console.log('Duration:', result.duration, 'ms');
  console.log('Number of messages:', result.messages.length);
  console.log('\nResponse:');
  console.log(result.data);
}

main().catch(console.error);
