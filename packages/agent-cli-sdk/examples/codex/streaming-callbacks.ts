#!/usr/bin/env tsx
/**
 * Example of using execute() with streaming callbacks
 * Shows real-time message processing as Codex responds
 */

import { execute } from '../../src/index';

async function main() {
  console.log('Running Codex command with streaming callbacks...\n');

  let eventCount = 0;
  let messageCount = 0;
  let toolUseCount = 0;

  const result = await execute({
    tool: 'codex',
    prompt: 'Count the number of TypeScript files in the src directory',
    verbose: false,
    onEvent: ({ raw, event, message }) => {
      eventCount++;

      // Process each message as it arrives
      if (message) {
        messageCount++;

        console.log(`\n[Message ${messageCount}] Role: ${message.role}`);

        if (message.role === 'assistant' && Array.isArray(message.content)) {
          message.content.forEach((block) => {
            if (block.type === 'tool_use') {
              toolUseCount++;
              console.log(`  Tool: ${block.name} (id: ${block.id.substring(0, 8)}...)`);
              console.log(`  Input: ${JSON.stringify(block.input).substring(0, 100)}...`);
            } else if (block.type === 'text') {
              console.log(`  Text: ${block.text.substring(0, 100)}...`);
            } else if (block.type === 'thinking') {
              console.log(`  Thinking: ${block.thinking.substring(0, 100)}...`);
            }
          });
        } else if (message.role === 'tool') {
          console.log(`  Tool result for: ${message.tool_use_id}`);
          if (typeof message.content === 'string') {
            console.log(`  Content: ${message.content.substring(0, 100)}...`);
          }
        }
      }

      // Show Codex-specific events
      if (event.type === 'thread.started') {
        console.log(`\n[Thread Started] ID: ${event.thread_id}`);
      } else if (event.type === 'turn.started') {
        console.log('\n[Turn Started]');
      } else if (event.type === 'turn.completed') {
        console.log('\n[Turn Completed]');
        if (event.usage) {
          console.log('  Token usage:', event.usage);
        }
      }
    },
  });

  console.log('\n=== Summary ===');
  console.log('Total events:', eventCount);
  console.log('Total messages:', messageCount);
  console.log('Tool uses:', toolUseCount);
  console.log('Success:', result.success);
  console.log('Exit code:', result.exitCode);
  console.log('Duration:', result.duration, 'ms');
  console.log('\nFinal response:');
  console.log(result.data);
}

main().catch(console.error);
