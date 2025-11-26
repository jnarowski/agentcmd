import { describe, it, expect } from 'vitest';
import type {
  BashToolInput,
  ReadToolInput,
  WriteToolInput,
  EditToolInput,
  GlobToolInput,
  GrepToolInput,
  TodoWriteToolInput,
  WebSearchToolInput,
  AskUserQuestionToolInput,
  ExitPlanModeToolInput,
  McpToolInput,
  ToolName,
  UnifiedToolUseBlock,
} from './unified';
import { extractSessionIdFromEvents } from './unified';

describe('Tool Input Types', () => {
  describe('BashToolInput', () => {
    it('should accept valid Bash tool input', () => {
      const input: BashToolInput = {
        command: 'ls -la',
        description: 'List directory contents',
      };

      expect(input.command).toBe('ls -la');
      expect(input.description).toBe('List directory contents');
    });

    it('should match real JSONL data structure', () => {
      const input: BashToolInput = {
        command: 'find . -maxdepth 3 -type f -name "*.json" -o -name "*.md" -o -name "*.ts" -o -name "*" | head -50',
        description: 'List key files in the project',
      };

      expect(input).toBeDefined();
      expect(typeof input.command).toBe('string');
      expect(typeof input.description).toBe('string');
    });
  });

  describe('ReadToolInput', () => {
    it('should accept file_path only', () => {
      const input: ReadToolInput = {
        file_path: '/path/to/file.ts',
      };

      expect(input.file_path).toBe('/path/to/file.ts');
      expect(input.offset).toBeUndefined();
      expect(input.limit).toBeUndefined();
    });

    it('should accept optional offset and limit', () => {
      const input: ReadToolInput = {
        file_path: '/path/to/file.ts',
        offset: 10,
        limit: 50,
      };

      expect(input.offset).toBe(10);
      expect(input.limit).toBe(50);
    });

    it('should match real JSONL data structure', () => {
      const input: ReadToolInput = {
        file_path: '/Users/jnarowski/Dev/sourceborn/src/agent-workflows-monorepo-v2/package.json',
      };

      expect(input).toBeDefined();
    });
  });

  describe('WriteToolInput', () => {
    it('should accept valid Write tool input', () => {
      const input: WriteToolInput = {
        file_path: '/path/to/new-file.ts',
        content: 'export const foo = "bar";',
      };

      expect(input.file_path).toBe('/path/to/new-file.ts');
      expect(input.content).toBe('export const foo = "bar";');
    });

    it('should match real JSONL data structure', () => {
      const input: WriteToolInput = {
        file_path:
          '/Users/jnarowski/Dev/sourceborn/src/agent-workflows-monorepo-v2/apps/app/src/client/components/NavUser.test.tsx',
        content: 'import { describe, it, expect } from "vitest";',
      };

      expect(input).toBeDefined();
    });
  });

  describe('EditToolInput', () => {
    it('should accept valid Edit tool input', () => {
      const input: EditToolInput = {
        file_path: '/path/to/file.ts',
        old_string: 'const foo = "old";',
        new_string: 'const foo = "new";',
      };

      expect(input.file_path).toBe('/path/to/file.ts');
      expect(input.old_string).toBe('const foo = "old";');
      expect(input.new_string).toBe('const foo = "new";');
    });

    it('should match real JSONL data structure with multiline strings', () => {
      const input: EditToolInput = {
        file_path:
          '/Users/jnarowski/Dev/sourceborn/src/agent-workflows-monorepo-v2/apps/app/src/client/components/NavUser.tsx',
        old_string: 'import { ChevronsUpDown, LogOut } from "lucide-react";\n\nimport {',
        new_string:
          'import { ChevronsUpDown, LogOut } from "lucide-react";\n\nfunction getInitials(name: string) { return "JD"; }\n\nimport {',
      };

      expect(input).toBeDefined();
      expect(input.old_string).toContain('import');
      expect(input.new_string).toContain('getInitials');
    });
  });

  describe('GlobToolInput', () => {
    it('should accept pattern', () => {
      const input: GlobToolInput = {
        pattern: '**/*.ts',
      };

      expect(input.pattern).toBe('**/*.ts');
    });

    it('should match real JSONL data structure', () => {
      const input: GlobToolInput = {
        pattern: '**/NavUser.{tsx,ts,jsx,js}',
      };

      expect(input).toBeDefined();
      expect(input.pattern).toContain('NavUser');
    });
  });

  describe('GrepToolInput', () => {
    it('should accept basic pattern and output_mode', () => {
      const input: GrepToolInput = {
        pattern: 'function',
        output_mode: 'files_with_matches',
      };

      expect(input.pattern).toBe('function');
      expect(input.output_mode).toBe('files_with_matches');
    });

    it('should accept optional path field', () => {
      const input: GrepToolInput = {
        pattern: 'NavUser',
        output_mode: 'files_with_matches',
        path: '/path/to/search',
      };

      expect(input.path).toBe('/path/to/search');
    });

    it('should accept optional -n flag', () => {
      const input: GrepToolInput = {
        pattern: 'type.*Content|interface.*Content',
        output_mode: 'content',
        '-n': true,
      };

      expect(input['-n']).toBe(true);
    });

    it('should match real JSONL data structure from sample-web-search.jsonl', () => {
      const input: GrepToolInput = {
        pattern: 'type.*Content|interface.*Content',
        path: '/Users/jnarowski/Dev/sourceborn/src/agent-workflows-monorepo-v2/packages/agent-cli-sdk',
        output_mode: 'content',
        '-n': true,
      };

      expect(input).toBeDefined();
      expect(input.path).toBeDefined();
      expect(input['-n']).toBe(true);
    });
  });

  describe('TodoWriteToolInput', () => {
    it('should accept todos array', () => {
      const input: TodoWriteToolInput = {
        todos: [
          {
            content: 'Fix bug in parser',
            status: 'in_progress',
            activeForm: 'Fixing bug in parser',
          },
          {
            content: 'Write tests',
            status: 'pending',
            activeForm: 'Writing tests',
          },
        ],
      };

      expect(input.todos).toHaveLength(2);
      expect(input.todos[0]?.status).toBe('in_progress');
      expect(input.todos[1]?.status).toBe('pending');
    });

    it('should match real JSONL data structure', () => {
      const input: TodoWriteToolInput = {
        todos: [
          {
            content: 'Explore codebase structure and understand project layout',
            status: 'in_progress',
            activeForm: 'Exploring codebase structure and understanding project layout',
          },
          {
            content: 'Review package.json and dependencies',
            status: 'pending',
            activeForm: 'Reviewing package.json and dependencies',
          },
        ],
      };

      expect(input).toBeDefined();
      expect(input.todos[0]?.content).toContain('Explore codebase');
    });
  });

  describe('WebSearchToolInput', () => {
    it('should accept query string', () => {
      const input: WebSearchToolInput = {
        query: 'TypeScript best practices',
      };

      expect(input.query).toBe('TypeScript best practices');
    });

    it('should match real JSONL data structure from sample-web-search.jsonl', () => {
      const input: WebSearchToolInput = {
        query: 'Claude Code response types API',
      };

      expect(input).toBeDefined();
      expect(input.query).toBe('Claude Code response types API');
    });

    it('should handle complex search queries', () => {
      const input: WebSearchToolInput = {
        query: '"Claude Code" response types tool_use text_content',
      };

      expect(input.query).toContain('"Claude Code"');
    });
  });

  describe('AskUserQuestionToolInput', () => {
    it('should accept questions array', () => {
      const input: AskUserQuestionToolInput = {
        questions: [
          {
            question: 'Which framework should we use?',
            header: 'Framework',
            multiSelect: false,
            options: [
              {
                label: 'React',
                description: 'Popular UI library',
              },
              {
                label: 'Vue',
                description: 'Progressive framework',
              },
            ],
          },
        ],
      };

      expect(input.questions).toHaveLength(1);
      expect(input.questions[0]?.options).toHaveLength(2);
      expect(input.questions[0]?.multiSelect).toBe(false);
    });

    it('should match real JSONL data structure from sample-four.jsonl', () => {
      const input: AskUserQuestionToolInput = {
        questions: [
          {
            question: 'Where exactly should the + button be positioned relative to the search input?',
            header: 'Button position',
            multiSelect: false,
            options: [
              {
                label: 'Right of search, before ⌘J kbd',
                description:
                  'The + button moves outside the search input but stays before the ⌘J keyboard shortcut indicator',
              },
              {
                label: 'Right of ⌘J kbd',
                description: 'The + button moves completely to the right, after the ⌘J keyboard shortcut indicator',
              },
            ],
          },
        ],
      };

      expect(input).toBeDefined();
      expect(input.questions[0]?.question).toContain('+ button');
      expect(input.questions[0]?.header).toBe('Button position');
    });

    it('should match real JSONL data with multiple questions and multiSelect variations', () => {
      const input: AskUserQuestionToolInput = {
        questions: [
          {
            question: 'Which framework should we use?',
            header: 'Framework',
            multiSelect: false,
            options: [
              { label: 'React', description: 'Popular library with large ecosystem' },
              { label: 'Vue', description: 'Progressive framework, easy to learn' },
              { label: 'Svelte', description: 'Compile-time framework, no virtual DOM' },
            ],
          },
          {
            question: 'What styling approach do you prefer?',
            header: 'Styling',
            multiSelect: false,
            options: [
              { label: 'CSS Modules', description: 'Scoped CSS files' },
              { label: 'Tailwind', description: 'Utility-first CSS' },
              { label: 'Styled Components', description: 'CSS-in-JS solution' },
            ],
          },
          {
            question: 'Which features should we include?',
            header: 'Features',
            multiSelect: true,
            options: [
              { label: 'Dark mode', description: 'Theme switching support' },
              { label: 'Animations', description: 'UI transitions and effects' },
              { label: 'Accessibility', description: 'ARIA labels and keyboard nav' },
            ],
          },
        ],
      };

      expect(input).toBeDefined();
      expect(input.questions).toHaveLength(3);
      expect(input.questions[0]?.multiSelect).toBe(false);
      expect(input.questions[1]?.multiSelect).toBe(false);
      expect(input.questions[2]?.multiSelect).toBe(true);
      expect(input.questions[0]?.header).toBe('Framework');
      expect(input.questions[1]?.header).toBe('Styling');
      expect(input.questions[2]?.header).toBe('Features');
    });

    it('should support multiSelect questions', () => {
      const input: AskUserQuestionToolInput = {
        questions: [
          {
            question: 'Which features do you want?',
            header: 'Features',
            multiSelect: true,
            options: [
              { label: 'Dark mode', description: 'Enable dark theme' },
              { label: 'Notifications', description: 'Push notifications' },
            ],
          },
        ],
      };

      expect(input.questions[0]?.multiSelect).toBe(true);
    });
  });

  describe('ExitPlanModeToolInput', () => {
    it('should accept plan string', () => {
      const input: ExitPlanModeToolInput = {
        plan: 'Update the component to use the new API',
      };

      expect(input.plan).toBe('Update the component to use the new API');
    });

    it('should match real JSONL data structure from sample-four.jsonl', () => {
      const input: ExitPlanModeToolInput = {
        plan: `Move the "+" button from inside the search input to be a separate button positioned to the right of the ⌘J keyboard shortcut.

**Changes to CommandMenu.tsx:**
1. Remove the Plus button from inside the search input (currently at line 71-78)
2. Move the Plus button outside the relative container to be a sibling element
3. Update the layout to have the search input and Plus button as separate flex items with appropriate spacing`,
      };

      expect(input).toBeDefined();
      expect(input.plan).toContain('Move the "+" button');
      expect(input.plan).toContain('**Changes to CommandMenu.tsx:**');
    });

    it('should handle multiline markdown plans', () => {
      const input: ExitPlanModeToolInput = {
        plan: `# Plan

## Step 1
Do something

## Step 2
Do something else`,
      };

      expect(input.plan).toContain('# Plan');
      expect(input.plan).toContain('## Step 1');
    });
  });

  describe('McpToolInput', () => {
    it('should accept dynamic structure', () => {
      const input: McpToolInput = {
        title: 'New Chat Session',
      };

      expect(input.title).toBe('New Chat Session');
    });

    it('should match real JSONL data structure for mcp__happy__change_title', () => {
      const input: McpToolInput = {
        title: 'Codebase Audit',
      };

      expect(input).toBeDefined();
      expect(input.title).toBe('Codebase Audit');
    });

    it('should accept arbitrary fields', () => {
      const input: McpToolInput = {
        customField: 'value',
        nested: {
          deep: 'property',
        },
        array: [1, 2, 3],
      };

      expect(input.customField).toBe('value');
      expect(input.nested).toBeDefined();
      expect(input.array).toHaveLength(3);
    });
  });

  describe('ToolName', () => {
    it('should accept known tool names', () => {
      const tools: ToolName[] = [
        'Bash',
        'Read',
        'Write',
        'Edit',
        'Glob',
        'Grep',
        'TodoWrite',
        'WebSearch',
        'AskUserQuestion',
        'ExitPlanMode',
      ];

      tools.forEach((tool) => {
        expect(typeof tool).toBe('string');
      });
    });

    it('should accept MCP tool names', () => {
      const mcpTools: ToolName[] = ['mcp__happy__change_title', 'mcp__custom__tool', 'mcp__any__name'];

      mcpTools.forEach((tool) => {
        expect(tool).toContain('mcp__');
      });
    });
  });

  describe('UnifiedToolUseBlock', () => {
    it('should accept Bash tool use', () => {
      const block: UnifiedToolUseBlock = {
        type: 'tool_use',
        id: 'toolu_123',
        name: 'Bash',
        input: {
          command: 'ls -la',
          description: 'List files',
        },
      };

      expect(block.type).toBe('tool_use');
      expect(block.name).toBe('Bash');
    });

    it('should accept WebSearch tool use', () => {
      const block: UnifiedToolUseBlock = {
        type: 'tool_use',
        id: 'toolu_456',
        name: 'WebSearch',
        input: {
          query: 'TypeScript types',
        },
      };

      expect(block.name).toBe('WebSearch');
      expect(block.input.query).toBe('TypeScript types');
    });

    it('should accept AskUserQuestion tool use', () => {
      const block: UnifiedToolUseBlock = {
        type: 'tool_use',
        id: 'toolu_789',
        name: 'AskUserQuestion',
        input: {
          questions: [
            {
              question: 'Choose option',
              header: 'Option',
              multiSelect: false,
              options: [
                { label: 'A', description: 'Option A' },
                { label: 'B', description: 'Option B' },
              ],
            },
          ],
        },
      };

      expect(block.name).toBe('AskUserQuestion');
      expect(block.input.questions).toBeDefined();
    });

    it('should accept ExitPlanMode tool use', () => {
      const block: UnifiedToolUseBlock = {
        type: 'tool_use',
        id: 'toolu_999',
        name: 'ExitPlanMode',
        input: {
          plan: 'Execute the plan',
        },
      };

      expect(block.name).toBe('ExitPlanMode');
      expect(block.input.plan).toBe('Execute the plan');
    });

    it('should accept MCP tool use', () => {
      const block: UnifiedToolUseBlock = {
        type: 'tool_use',
        id: 'toolu_mcp',
        name: 'mcp__happy__change_title',
        input: {
          title: 'New Title',
        },
      };

      expect(block.name).toContain('mcp__');
      expect(block.input.title).toBe('New Title');
    });
  });

  describe('Type compatibility with real JSONL data', () => {
    it('should handle all tools found in sample.jsonl', () => {
      const tools: ToolName[] = ['Bash', 'Read', 'TodoWrite', 'mcp__happy__change_title'];

      tools.forEach((tool) => {
        expect(typeof tool).toBe('string');
      });
    });

    it('should handle all tools found in sample-two.jsonl', () => {
      const tools: ToolName[] = ['Bash', 'Edit', 'Glob', 'Grep', 'Read', 'Write'];

      tools.forEach((tool) => {
        expect(typeof tool).toBe('string');
      });
    });

    it('should handle all tools found in sample-web-search.jsonl', () => {
      const tools: ToolName[] = ['Grep', 'Read', 'WebSearch'];

      tools.forEach((tool) => {
        expect(typeof tool).toBe('string');
      });
    });

    it('should handle all tools found in sample-four.jsonl', () => {
      const tools: ToolName[] = ['AskUserQuestion', 'Edit', 'ExitPlanMode', 'Read', 'TodoWrite'];

      tools.forEach((tool) => {
        expect(typeof tool).toBe('string');
      });
    });

    it('should handle complete tool coverage', () => {
      const allToolsFromJsonl: ToolName[] = [
        'AskUserQuestion',
        'Bash',
        'Edit',
        'ExitPlanMode',
        'Glob',
        'Grep',
        'Read',
        'TodoWrite',
        'WebSearch',
        'Write',
        'mcp__happy__change_title',
      ];

      expect(allToolsFromJsonl).toHaveLength(11);

      // Verify each tool is a valid ToolName
      allToolsFromJsonl.forEach((tool) => {
        expect(typeof tool).toBe('string');
        expect(tool.length).toBeGreaterThan(0);
      });
    });
  });

  describe('extractSessionIdFromEvents', () => {
    it('should extract session ID from first event with sessionId', () => {
      const events = [
        { type: 'event1' },
        { type: 'event2', sessionId: 'session-123' },
        { type: 'event3', sessionId: 'session-456' },
      ];

      expect(extractSessionIdFromEvents(events)).toBe('session-123');
    });

    it('should return "unknown" if no events have sessionId', () => {
      const events: { sessionId?: string }[] = [{}, {}, {}];

      expect(extractSessionIdFromEvents(events)).toBe('unknown');
    });

    it('should return "unknown" for empty array', () => {
      expect(extractSessionIdFromEvents([])).toBe('unknown');
    });

    it('should handle events where sessionId is undefined', () => {
      const events = [
        { type: 'event1', sessionId: undefined },
        { type: 'event2', sessionId: 'session-789' },
      ];

      expect(extractSessionIdFromEvents(events)).toBe('session-789');
    });

    it('should handle events where sessionId is empty string', () => {
      const events = [
        { type: 'event1', sessionId: '' },
        { type: 'event2', sessionId: 'session-abc' },
      ];

      // Empty string is falsy, so it should skip to next
      expect(extractSessionIdFromEvents(events)).toBe('session-abc');
    });

    it('should return first non-empty sessionId', () => {
      const events = [
        { type: 'event1' },
        { type: 'event2', sessionId: 'first-session' },
        { type: 'event3', sessionId: 'second-session' },
      ];

      expect(extractSessionIdFromEvents(events)).toBe('first-session');
    });

    it('should work with Claude-style events', () => {
      interface ClaudeEvent {
        type: string;
        sessionId?: string;
        data?: unknown;
      }

      const events: ClaudeEvent[] = [
        { type: 'session_init', sessionId: 'claude-session-123' },
        { type: 'message_start', data: {} },
      ];

      expect(extractSessionIdFromEvents(events)).toBe('claude-session-123');
    });

    it('should work with Codex-style events', () => {
      interface CodexEvent {
        event: string;
        sessionId?: string;
      }

      const events: CodexEvent[] = [{ event: 'session_meta', sessionId: 'codex-session-456' }, { event: 'reasoning' }];

      expect(extractSessionIdFromEvents(events)).toBe('codex-session-456');
    });

    it('should handle complex event objects with nested data', () => {
      const events = [
        {
          type: 'complex',
          data: { nested: 'value' },
          metadata: { timestamp: 123 },
        },
        {
          type: 'with-session',
          sessionId: 'nested-session-789',
          data: { complex: { nested: { deep: 'value' } } },
        },
      ];

      expect(extractSessionIdFromEvents(events)).toBe('nested-session-789');
    });
  });
});
