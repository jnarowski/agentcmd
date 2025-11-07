#!/usr/bin/env node
import { readFile, writeFile, readdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface CodexEvent {
  timestamp: string;
  type: 'session_meta' | 'response_item' | 'event_msg' | 'turn_context';
  payload?: any;
}

interface PatternExample {
  name: string;
  examples: CodexEvent[];
  description?: string;
}

async function loadSampleFiles(fixturesDir: string): Promise<CodexEvent[]> {
  const files = await readdir(fixturesDir);
  const sampleFiles = files.filter(f => f.endsWith('.jsonl'));

  const allEvents: CodexEvent[] = [];

  for (const file of sampleFiles) {
    const filePath = join(fixturesDir, file);
    const content = await readFile(filePath, 'utf-8');
    const lines = content.split('\n').filter(l => l.trim());

    for (const line of lines) {
      try {
        const event = JSON.parse(line);
        allEvents.push(event);
      } catch (err) {
        console.error(`Error parsing line in ${file}:`, err);
      }
    }
  }

  return allEvents;
}

function extractPatterns(events: CodexEvent[]): Map<string, PatternExample> {
  const patterns = new Map<string, PatternExample>();

  for (const event of events) {
    const eventType = event.type;
    const payload = event.payload;

    // Session metadata
    if (eventType === 'session_meta') {
      const patternKey = 'session-meta';
      if (!patterns.has(patternKey)) {
        patterns.set(patternKey, {
          name: patternKey,
          examples: [],
          description: 'Session initialization metadata',
        });
      }
      const pattern = patterns.get(patternKey)!;
      if (pattern.examples.length < 3) {
        pattern.examples.push(event);
      }
      continue;
    }

    // Turn context
    if (eventType === 'turn_context') {
      const patternKey = 'turn-context';
      if (!patterns.has(patternKey)) {
        patterns.set(patternKey, {
          name: patternKey,
          examples: [],
          description: 'Turn execution context (approval policy, sandbox mode)',
        });
      }
      const pattern = patterns.get(patternKey)!;
      if (pattern.examples.length < 3) {
        pattern.examples.push(event);
      }
      continue;
    }

    // Response items
    if (eventType === 'response_item' && payload?.type) {
      const payloadType = payload.type;

      if (payloadType === 'message') {
        const role = payload.role || 'unknown';
        const patternKey = `response-message-${role}`;
        if (!patterns.has(patternKey)) {
          patterns.set(patternKey, {
            name: patternKey,
            examples: [],
            description: `Message from ${role}`,
          });
        }
        const pattern = patterns.get(patternKey)!;
        if (pattern.examples.length < 3) {
          pattern.examples.push(event);
        }
      } else if (payloadType === 'reasoning') {
        const patternKey = 'response-reasoning';
        if (!patterns.has(patternKey)) {
          patterns.set(patternKey, {
            name: patternKey,
            examples: [],
            description: 'Agent reasoning text',
          });
        }
        const pattern = patterns.get(patternKey)!;
        if (pattern.examples.length < 3) {
          pattern.examples.push(event);
        }
      } else if (payloadType === 'function_call') {
        const functionName = payload.name || 'unknown';
        let patternKey = `function-${functionName.toLowerCase()}`;

        // Add more specific categorization for shell commands
        if (functionName === 'shell') {
          try {
            const args = JSON.parse(payload.arguments || '{}');
            const command = args.command;
            if (Array.isArray(command) && command.length > 0) {
              const firstArg = command[0];
              if (firstArg === 'bash') {
                patternKey = 'function-shell-bash';
              }
            }
          } catch {
            // Keep default pattern key
          }
        }

        if (!patterns.has(patternKey)) {
          patterns.set(patternKey, {
            name: patternKey,
            examples: [],
            description: `Function call: ${functionName}`,
          });
        }
        const pattern = patterns.get(patternKey)!;
        if (pattern.examples.length < 3) {
          pattern.examples.push(event);
        }
      } else if (payloadType === 'function_call_output') {
        // Check for errors in function output
        const hasError = payload.error || payload.exit_code !== 0;
        const patternKey = hasError
          ? 'function-output-error'
          : 'function-output-success';

        if (!patterns.has(patternKey)) {
          patterns.set(patternKey, {
            name: patternKey,
            examples: [],
            description: hasError
              ? 'Function execution errors'
              : 'Successful function execution',
          });
        }
        const pattern = patterns.get(patternKey)!;
        if (pattern.examples.length < 3) {
          pattern.examples.push(event);
        }
      }
    }

    // Event messages
    if (eventType === 'event_msg' && payload?.type) {
      const payloadType = payload.type;
      const patternKey = `event-${payloadType.replace(/_/g, '-')}`;

      if (!patterns.has(patternKey)) {
        patterns.set(patternKey, {
          name: patternKey,
          examples: [],
          description: `Event: ${payloadType}`,
        });
      }
      const pattern = patterns.get(patternKey)!;
      if (pattern.examples.length < 3) {
        pattern.examples.push(event);
      }
    }
  }

  // Detect parallel function calls
  let currentTurnFunctionCalls: CodexEvent[] = [];
  for (const event of events) {
    if (event.type === 'turn_context') {
      // New turn, reset
      if (currentTurnFunctionCalls.length > 1) {
        // Store the first event as representative
        const patternKey = 'function-parallel-calls';
        if (!patterns.has(patternKey)) {
          patterns.set(patternKey, {
            name: patternKey,
            examples: [],
            description: 'Multiple function calls in a single turn',
          });
        }
        const pattern = patterns.get(patternKey)!;
        if (pattern.examples.length < 3) {
          pattern.examples.push(currentTurnFunctionCalls[0]);
        }
      }
      currentTurnFunctionCalls = [];
    } else if (
      event.type === 'response_item' &&
      event.payload?.type === 'function_call'
    ) {
      currentTurnFunctionCalls.push(event);
    }
  }

  return patterns;
}

async function writeFixtures(
  patterns: Map<string, PatternExample>,
  fixturesDir: string
) {
  for (const [key, pattern] of patterns) {
    const fileName = `${key}.jsonl`;
    const filePath = join(fixturesDir, fileName);

    // Take the first example as the representative
    const example = pattern.examples[0];
    const content = JSON.stringify(example, null, 0);

    await writeFile(filePath, content + '\n', 'utf-8');
    console.log(`✓ Created ${fileName} (${pattern.description})`);
  }
}

async function main() {
  const codexFixturesDir = join(__dirname, '../tests/fixtures/codex');
  const fullSessionsDir = join(codexFixturesDir, 'full');
  const individualFixturesDir = join(codexFixturesDir, 'individual');

  console.log('Loading full Codex session files...');
  const events = await loadSampleFiles(fullSessionsDir);
  console.log(`Loaded ${events.length} events`);

  console.log('\nAnalyzing patterns...');
  const patterns = extractPatterns(events);
  console.log(`Found ${patterns.size} unique patterns`);

  console.log('\nWriting individual fixtures...');
  await writeFixtures(patterns, individualFixturesDir);

  console.log('\n✓ Done!');
  console.log('\nPattern summary:');
  for (const [key, pattern] of patterns) {
    console.log(`  - ${key}: ${pattern.examples.length} example(s)`);
  }
}

main().catch(console.error);
