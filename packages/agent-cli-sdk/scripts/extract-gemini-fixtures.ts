#!/usr/bin/env node
import { readFile, writeFile, readdir, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface ToolCall {
  id: string;
  name: string;
  args: any;
  result?: any[];
  status?: string;
  timestamp?: string;
  resultDisplay?: string;
  displayName?: string;
  description?: string;
  renderOutputAsMarkdown?: boolean;
}

interface Thought {
  subject: string;
  description: string;
  timestamp: string;
}

interface Message {
  id: string;
  timestamp: string;
  type: string;
  content: string;
  toolCalls?: ToolCall[];
  thoughts?: Thought[];
  model?: string;
  tokens?: {
    input: number;
    output: number;
    cached: number;
    thoughts: number;
    tool: number;
    total: number;
  };
}

interface Session {
  sessionId: string;
  projectHash: string;
  startTime: string;
  lastUpdated: string;
  messages: Message[];
}

interface ToolUsePattern {
  name: string;
  examples: Message[];
  description?: string;
}

async function loadSessionFiles(fullSessionsDir: string): Promise<Message[]> {
  const files = await readdir(fullSessionsDir);
  const sessionFiles = files.filter(f => f.startsWith('session-') && f.endsWith('.json'));

  const allMessages: Message[] = [];

  for (const file of sessionFiles) {
    const filePath = join(fullSessionsDir, file);
    const content = await readFile(filePath, 'utf-8');

    try {
      const session: Session = JSON.parse(content);
      allMessages.push(...session.messages);
    } catch (err) {
      console.error(`Error parsing ${file}:`, err);
    }
  }

  return allMessages;
}

function extractToolUsePatterns(messages: Message[]): Map<string, ToolUsePattern> {
  const patterns = new Map<string, ToolUsePattern>();

  for (const message of messages) {
    // Skip non-gemini messages
    if (message.type !== 'gemini' || !message.toolCalls) {
      continue;
    }

    // Extract tool call patterns
    for (const toolCall of message.toolCalls) {
      const toolName = toolCall.name;

      // Create specific pattern keys based on tool characteristics
      let patternKey = `tool-${toolName.toLowerCase()}`;

      // Add more specific categorization for common tools
      if (toolName === 'shell' || toolName === 'bash' || toolName === 'execute_command') {
        const command = toolCall.args?.command || '';
        if (command.includes('&&')) {
          patternKey = 'tool-shell-chained';
        } else if (command.includes('|')) {
          patternKey = 'tool-shell-piped';
        } else if (command.startsWith('git')) {
          patternKey = 'tool-shell-git';
        } else if (command.startsWith('npm') || command.startsWith('pnpm') || command.startsWith('yarn')) {
          patternKey = 'tool-shell-package-manager';
        }
      } else if (toolName === 'read_file') {
        if (toolCall.args?.limit || toolCall.args?.offset) {
          patternKey = 'tool-read-file-partial';
        }
      } else if (toolName === 'write_file') {
        patternKey = 'tool-write-file';
      } else if (toolName === 'edit_file') {
        if (toolCall.args?.replace_all) {
          patternKey = 'tool-edit-file-replace-all';
        }
      } else if (toolName === 'web_fetch') {
        patternKey = 'tool-web-fetch';
      } else if (toolName === 'glob') {
        patternKey = 'tool-glob';
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

      // Track tool results (success vs error)
      if (toolCall.status) {
        const statusKey = `tool-result-${toolCall.status}`;
        if (!patterns.has(statusKey)) {
          patterns.set(statusKey, {
            name: statusKey,
            examples: [],
            description: `Tool execution with ${toolCall.status} status`,
          });
        }
        const statusPattern = patterns.get(statusKey)!;
        if (statusPattern.examples.length < 3) {
          statusPattern.examples.push(message);
        }
      }
    }

    // Check for parallel tool calls (multiple tools in one message)
    if (message.toolCalls.length > 1) {
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

    // Extract messages with thoughts
    if (message.thoughts && message.thoughts.length > 0) {
      const patternKey = 'gemini-with-thoughts';
      if (!patterns.has(patternKey)) {
        patterns.set(patternKey, {
          name: patternKey,
          examples: [],
          description: 'Gemini messages with reasoning/thoughts',
        });
      }
      const pattern = patterns.get(patternKey)!;
      if (pattern.examples.length < 3) {
        pattern.examples.push(message);
      }
    }

    // Extract text-only responses (no tool calls)
    if (!message.toolCalls || message.toolCalls.length === 0) {
      const patternKey = 'gemini-text-only';
      if (!patterns.has(patternKey)) {
        patterns.set(patternKey, {
          name: patternKey,
          examples: [],
          description: 'Text-only gemini responses',
        });
      }
      const pattern = patterns.get(patternKey)!;
      if (pattern.examples.length < 3) {
        pattern.examples.push(message);
      }
    }
  }

  // Extract user message patterns
  for (const message of messages) {
    if (message.type === 'user' && message.content) {
      // Check for various user message patterns
      if (message.content.includes('```')) {
        const patternKey = 'user-with-code-block';
        if (!patterns.has(patternKey)) {
          patterns.set(patternKey, {
            name: patternKey,
            examples: [],
            description: 'User messages with code blocks',
          });
        }
        const pattern = patterns.get(patternKey)!;
        if (pattern.examples.length < 3) {
          pattern.examples.push(message);
        }
      }
    }
  }

  return patterns;
}

async function writeFixtures(patterns: Map<string, ToolUsePattern>, fixturesDir: string) {
  // Ensure directory exists
  await mkdir(fixturesDir, { recursive: true });

  for (const [key, pattern] of patterns) {
    const fileName = `${key}.json`;
    const filePath = join(fixturesDir, fileName);

    // Take the first example as the representative
    const example = pattern.examples[0];
    const content = JSON.stringify(example, null, 2);

    await writeFile(filePath, content + '\n', 'utf-8');
    console.log(`✓ Created ${fileName} (${pattern.description})`);
  }
}

async function main() {
  const geminiFixturesDir = join(__dirname, '../tests/fixtures/gemini');
  const fullSessionsDir = join(geminiFixturesDir, 'full');
  const individualFixturesDir = join(geminiFixturesDir, 'individual');

  console.log('Loading full session files...');
  const messages = await loadSessionFiles(fullSessionsDir);
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
