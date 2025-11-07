#!/usr/bin/env node
import { readFile, writeFile, readdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface Message {
  type: string;
  message?: {
    role?: string;
    content?: any;
  };
  [key: string]: any;
}

interface ToolUsePattern {
  name: string;
  examples: Message[];
  description?: string;
}

async function loadSampleFiles(fixturesDir: string): Promise<Message[]> {
  const files = await readdir(fixturesDir);
  const sampleFiles = files.filter(f =>
    (f.startsWith('sample-') || f.startsWith('full-session-')) &&
    f.endsWith('.jsonl')
  );

  const allMessages: Message[] = [];

  for (const file of sampleFiles) {
    const filePath = join(fixturesDir, file);
    const content = await readFile(filePath, 'utf-8');
    const lines = content.split('\n').filter(l => l.trim());

    for (const line of lines) {
      try {
        const message = JSON.parse(line);
        allMessages.push(message);
      } catch (err) {
        console.error(`Error parsing line in ${file}:`, err);
      }
    }
  }

  return allMessages;
}

function extractToolUsePatterns(messages: Message[]): Map<string, ToolUsePattern> {
  const patterns = new Map<string, ToolUsePattern>();

  for (const message of messages) {
    // Skip non-assistant messages
    if (message.type !== 'assistant' || !message.message?.content) {
      continue;
    }

    const content = message.message.content;

    // Handle array content (tool uses)
    if (Array.isArray(content)) {
      for (const item of content) {
        if (item.type === 'tool_use') {
          const toolName = item.name;

          // Create specific pattern keys based on tool characteristics
          let patternKey = `tool-${toolName.toLowerCase()}`;

          // Add more specific categorization for common tools
          if (toolName === 'Bash') {
            const command = item.input?.command || '';
            if (command.includes('&&')) {
              patternKey = 'tool-bash-chained';
            } else if (command.includes('|')) {
              patternKey = 'tool-bash-piped';
            } else if (command.startsWith('git')) {
              patternKey = 'tool-bash-git';
            } else if (command.startsWith('npm') || command.startsWith('pnpm') || command.startsWith('yarn')) {
              patternKey = 'tool-bash-package-manager';
            }
          } else if (toolName === 'Read') {
            if (item.input?.limit || item.input?.offset) {
              patternKey = 'tool-read-partial';
            }
          } else if (toolName === 'Edit') {
            if (item.input?.replace_all) {
              patternKey = 'tool-edit-replace-all';
            }
          } else if (toolName === 'AskUserQuestion') {
            const questions = item.input?.questions || [];
            if (questions.some((q: any) => q.multiSelect)) {
              patternKey = 'tool-askuserquestion-multiselect';
            }
          } else if (toolName === 'Task') {
            const subagentType = item.input?.subagent_type;
            if (subagentType) {
              patternKey = `tool-task-${subagentType.toLowerCase()}`;
            }
          }

          if (!patterns.has(patternKey)) {
            patterns.set(patternKey, {
              name: patternKey,
              examples: [],
              description: `Examples of ${toolName} tool usage`,
            });
          }

          const pattern = patterns.get(patternKey)!;

          // Only add if we don't have too many examples already
          if (pattern.examples.length < 3) {
            pattern.examples.push(message);
          }
        } else if (item.type === 'text') {
          // Track text-only responses
          const patternKey = 'assistant-text-only';
          if (!patterns.has(patternKey)) {
            patterns.set(patternKey, {
              name: patternKey,
              examples: [],
              description: 'Text-only assistant responses',
            });
          }
          const pattern = patterns.get(patternKey)!;
          if (pattern.examples.length < 3) {
            pattern.examples.push(message);
          }
        }
      }
    }

    // Check for parallel tool calls (multiple tool_use in one message)
    if (Array.isArray(content)) {
      const toolUses = content.filter(item => item.type === 'tool_use');
      if (toolUses.length > 1) {
        const patternKey = 'tool-parallel-calls';
        if (!patterns.has(patternKey)) {
          patterns.set(patternKey, {
            name: patternKey,
            examples: [],
            description: 'Multiple tool calls in parallel',
          });
        }
        const pattern = patterns.get(patternKey)!;
        if (pattern.examples.length < 3) {
          pattern.examples.push(message);
        }
      }

      // Check for tool_result patterns
      const toolResults = content.filter(item => item.type === 'tool_result');
      if (toolResults.length > 0) {
        // Check for errors in tool results
        const hasError = toolResults.some(result => result.is_error || result.content?.includes('error'));
        const patternKey = hasError ? 'tool-result-error' : 'tool-result-success';

        if (!patterns.has(patternKey)) {
          patterns.set(patternKey, {
            name: patternKey,
            examples: [],
            description: hasError ? 'Tool execution errors' : 'Successful tool execution results',
          });
        }
        const pattern = patterns.get(patternKey)!;
        if (pattern.examples.length < 3) {
          pattern.examples.push(message);
        }
      }
    }
  }

  // Also extract some user message patterns
  for (const message of messages) {
    if (message.type === 'user' && message.message?.content) {
      const content = message.message.content;

      if (typeof content === 'string') {
        if (content.includes('<command-name>')) {
          const patternKey = 'user-slash-command';
          if (!patterns.has(patternKey)) {
            patterns.set(patternKey, {
              name: patternKey,
              examples: [],
              description: 'User slash command invocation',
            });
          }
          const pattern = patterns.get(patternKey)!;
          if (pattern.examples.length < 3) {
            pattern.examples.push(message);
          }
        }
      }
    }
  }

  return patterns;
}

async function writeFixtures(patterns: Map<string, ToolUsePattern>, fixturesDir: string) {
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
  const claudeFixturesDir = join(__dirname, '../tests/fixtures/claude');
  const fullSessionsDir = join(claudeFixturesDir, 'full');
  const individualFixturesDir = join(claudeFixturesDir, 'individual');

  console.log('Loading full session files...');
  const messages = await loadSampleFiles(fullSessionsDir);
  console.log(`Loaded ${messages.length} messages`);

  console.log('\nAnalyzing patterns...');
  const patterns = extractToolUsePatterns(messages);
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
