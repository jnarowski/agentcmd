import { describe, it, expect } from 'vitest';
import { parse } from './parse';

describe('parser', () => {
  // Real messages from actual Claude session (sample.jsonl)

  // User message with simple text content
  const realUserMessage =
    '{"parentUuid":null,"isSidechain":false,"userType":"external","cwd":"/Users/jnarowski/Dev/sourceborn/src/agent-workflows-monorepo-v2","sessionId":"cfa1e878-62b5-4e40-b281-bbf9b250d766","version":"2.0.14","gitBranch":"main","type":"user","message":{"role":"user","content":"Hey"},"uuid":"40100391-dfab-4f01-8ce8-7c6f2b1a5e8c","timestamp":"2025-10-21T03:21:27.040Z"}';

  // Assistant message with text content
  const realAssistantMessage =
    '{"parentUuid":"40100391-dfab-4f01-8ce8-7c6f2b1a5e8c","isSidechain":false,"userType":"external","cwd":"/Users/jnarowski/Dev/sourceborn/src/agent-workflows-monorepo-v2","sessionId":"cfa1e878-62b5-4e40-b281-bbf9b250d766","version":"2.0.14","gitBranch":"main","message":{"model":"claude-sonnet-4-5-20250929","id":"msg_01UEW7khEaq2scDXdByVaATi","type":"message","role":"assistant","content":[{"type":"text","text":"I\'ll help you with whatever you need! What would you like to work on today?"}],"stop_reason":null,"stop_sequence":null,"usage":{"input_tokens":3,"cache_creation_input_tokens":3526,"cache_read_input_tokens":11040,"cache_creation":{"ephemeral_5m_input_tokens":3526,"ephemeral_1h_input_tokens":0},"output_tokens":1,"service_tier":"standard"}},"requestId":"req_011CUKdBDkx47fo5CR13SAns","type":"assistant","uuid":"1962a5d2-635d-460b-b663-6e7208ddff76","timestamp":"2025-10-21T03:21:29.233Z"}';

  // Assistant message with MCP tool use
  const realToolUseMessage =
    '{"parentUuid":"1962a5d2-635d-460b-b663-6e7208ddff76","isSidechain":false,"userType":"external","cwd":"/Users/jnarowski/Dev/sourceborn/src/agent-workflows-monorepo-v2","sessionId":"cfa1e878-62b5-4e40-b281-bbf9b250d766","version":"2.0.14","gitBranch":"main","message":{"model":"claude-sonnet-4-5-20250929","id":"msg_01UEW7khEaq2scDXdByVaATi","type":"message","role":"assistant","content":[{"type":"tool_use","id":"toolu_01VZ4mZBZtXjHzEgB2dFd6Bs","name":"mcp__happy__change_title","input":{"title":"New Chat Session"}}],"stop_reason":null,"stop_sequence":null,"usage":{"input_tokens":3,"cache_creation_input_tokens":3526,"cache_read_input_tokens":11040,"cache_creation":{"ephemeral_5m_input_tokens":3526,"ephemeral_1h_input_tokens":0},"output_tokens":1,"service_tier":"standard"}},"requestId":"req_011CUKdBDkx47fo5CR13SAns","type":"assistant","uuid":"d147d7ae-ca2b-48fe-a068-7af2ad9c419e","timestamp":"2025-10-21T03:21:29.990Z"}';

  // User message with tool_result content
  const toolResultMessage =
    '{"parentUuid":"d147d7ae-ca2b-48fe-a068-7af2ad9c419e","isSidechain":false,"userType":"external","cwd":"/Users/jnarowski/Dev/sourceborn/src/agent-workflows-monorepo-v2","sessionId":"cfa1e878-62b5-4e40-b281-bbf9b250d766","version":"2.0.14","gitBranch":"main","type":"user","message":{"role":"user","content":[{"tool_use_id":"toolu_01VZ4mZBZtXjHzEgB2dFd6Bs","type":"tool_result","content":[{"type":"text","text":"Successfully changed chat title to: \\"New Chat Session\\""}]}]},"uuid":"83257e88-d48f-4283-9c8c-59a0cac30976","timestamp":"2025-10-21T03:21:30.144Z","toolUseResult":[{"type":"text","text":"Successfully changed chat title to: \\"New Chat Session\\""}]}';

  // Assistant message with special characters in text
  const messageWithSpecialChars =
    '{"parentUuid":"8d6c7ccb-025b-4497-a3e4-1b3a049e2f91","isSidechain":false,"userType":"external","cwd":"/Users/jnarowski/Dev/sourceborn/src/agent-workflows-monorepo-v2","sessionId":"cfa1e878-62b5-4e40-b281-bbf9b250d766","version":"2.0.14","gitBranch":"main","message":{"model":"claude-sonnet-4-5-20250929","id":"msg_01XjvytSLtruAi4HVpMs4LJc","type":"message","role":"assistant","content":[{"type":"text","text":"<options>\\n<option>Help me fix a bug</option>\\n<option>Add a new feature</option>\\n<option>Refactor some code</option>\\n<option>Review or explain code</option>\\n<option>Set up or configure something</option>\\n</options>"}],"stop_reason":null,"stop_sequence":null,"usage":{"input_tokens":6,"cache_creation_input_tokens":3620,"cache_read_input_tokens":11040,"cache_creation":{"ephemeral_5m_input_tokens":3620,"ephemeral_1h_input_tokens":0},"output_tokens":2,"service_tier":"standard"}},"requestId":"req_011CUKdBSiJvj1e7o692Gw9d","type":"assistant","uuid":"8d6c7ccb-025b-4497-a3e4-1b3a049e2f91","timestamp":"2025-10-21T03:21:33.237Z"}';

  // Assistant message with Bash tool use
  const bashToolMessage =
    '{"parentUuid":"85c95600-e086-42ff-b008-ee05d1f89c34","isSidechain":false,"userType":"external","cwd":"/Users/jnarowski/Dev/sourceborn/src/agent-workflows-monorepo-v2","sessionId":"cfa1e878-62b5-4e40-b281-bbf9b250d766","version":"2.0.14","gitBranch":"main","message":{"model":"claude-sonnet-4-5-20250929","id":"msg_01Fug8GaAX9QhQZkU8jDdRYU","type":"message","role":"assistant","content":[{"type":"tool_use","id":"toolu_011ifZCTiqxJCc9j1oDf8U77","name":"Bash","input":{"command":"find . -maxdepth 3 -type f -name \\"*.json\\" -o -name \\"*.md\\" -o -name \\"*.ts\\" -o -name \\"*.js\\" | head -50","description":"List key files in the project"}}],"stop_reason":null,"stop_sequence":null,"usage":{"input_tokens":7,"cache_creation_input_tokens":526,"cache_read_input_tokens":14660,"cache_creation":{"ephemeral_5m_input_tokens":526,"ephemeral_1h_input_tokens":0},"output_tokens":26,"service_tier":"standard"}},"requestId":"req_011CUKdDyVHp1kgp5xL7WFV5","type":"assistant","uuid":"6eae2f35-18f1-4956-9f7e-484011b5d1bf","timestamp":"2025-10-21T03:22:07.375Z"}';

  // Assistant message with Read tool use
  const readToolMessage =
    '{"parentUuid":"6ea1e438-5f17-4209-8c2d-aa8f85c32839","isSidechain":false,"userType":"external","cwd":"/Users/jnarowski/Dev/sourceborn/src/agent-workflows-monorepo-v2","sessionId":"cfa1e878-62b5-4e40-b281-bbf9b250d766","version":"2.0.14","gitBranch":"main","message":{"model":"claude-sonnet-4-5-20250929","id":"msg_01Fug8GaAX9QhQZkU8jDdRYU","type":"message","role":"assistant","content":[{"type":"tool_use","id":"toolu_01VurUqby2LFP9HtL3Lfv5fg","name":"Read","input":{"file_path":"/Users/jnarowski/Dev/sourceborn/src/agent-workflows-monorepo-v2/package.json"}}],"stop_reason":null,"stop_sequence":null,"usage":{"input_tokens":7,"cache_creation_input_tokens":526,"cache_read_input_tokens":14660,"cache_creation":{"ephemeral_5m_input_tokens":526,"ephemeral_1h_input_tokens":0},"output_tokens":26,"service_tier":"standard"}},"requestId":"req_011CUKdDyVHp1kgp5xL7WFV5","type":"assistant","uuid":"6ea1e438-5f17-4209-8c2d-aa8f85c32839","timestamp":"2025-10-21T03:22:08.688Z"}';

  // User message with complex toolUseResult metadata
  const complexToolResult =
    '{"parentUuid":"3c603d42-5a22-4850-983b-a44d9cf20e68","isSidechain":false,"userType":"external","cwd":"/Users/jnarowski/Dev/sourceborn/src/agent-workflows-monorepo-v2","sessionId":"cfa1e878-62b5-4e40-b281-bbf9b250d766","version":"2.0.14","gitBranch":"main","type":"user","message":{"role":"user","content":[{"tool_use_id":"toolu_0116WEyb81Mah8Hb9u29YXyW","type":"tool_result","content":"Todos have been modified successfully. Ensure that you continue to use the todo list to track your progress. Please proceed with the current tasks if applicable"}]},"uuid":"70f71971-7936-4cbf-91d0-22261c912813","timestamp":"2025-10-21T03:22:04.361Z","toolUseResult":{"oldTodos":[],"newTodos":[{"content":"Explore codebase structure and understand project layout","status":"in_progress","activeForm":"Exploring codebase structure and understanding project layout"}]}}';

  // Assistant message with TodoWrite tool use
  const todoWriteMessage =
    '{"parentUuid":"6dd808e1-5323-4917-a73a-2cb7b3eb13f5","isSidechain":false,"userType":"external","cwd":"/Users/jnarowski/Dev/sourceborn/src/agent-workflows-monorepo-v2","sessionId":"cfa1e878-62b5-4e40-b281-bbf9b250d766","version":"2.0.14","gitBranch":"main","message":{"model":"claude-sonnet-4-5-20250929","id":"msg_016s5eVR2dEB4RbiJkWPwgMf","type":"message","role":"assistant","content":[{"type":"tool_use","id":"toolu_0116WEyb81Mah8Hb9u29YXyW","name":"TodoWrite","input":{"todos":[{"content":"Explore codebase structure and understand project layout","status":"in_progress","activeForm":"Exploring codebase structure and understanding project layout"}]}}],"stop_reason":null,"stop_sequence":null,"usage":{"input_tokens":3,"cache_creation_input_tokens":181,"cache_read_input_tokens":14566,"cache_creation":{"ephemeral_5m_input_tokens":181,"ephemeral_1h_input_tokens":0},"output_tokens":4,"service_tier":"standard"}},"requestId":"req_011CUKdDSzjdQDj5azZsPxFW","type":"assistant","uuid":"85c95600-e086-42ff-b008-ee05d1f89c34","timestamp":"2025-10-21T03:22:04.038Z"}';

  // Assistant message with cache statistics
  const messageWithCache =
    '{"parentUuid":"81b38c35-b17f-4165-8e60-5fe4fdbe8b8a","isSidechain":false,"userType":"external","cwd":"/Users/jnarowski/Dev/sourceborn/src/agent-workflows-monorepo-v2","sessionId":"cfa1e878-62b5-4e40-b281-bbf9b250d766","version":"2.0.14","gitBranch":"main","message":{"model":"claude-sonnet-4-5-20250929","id":"msg_016s5eVR2dEB4RbiJkWPwgMf","type":"message","role":"assistant","content":[{"type":"tool_use","id":"toolu_011YYBysX3VvgEUTM9L2iWCJ","name":"mcp__happy__change_title","input":{"title":"Codebase Audit"}}],"stop_reason":null,"stop_sequence":null,"usage":{"input_tokens":3,"cache_creation_input_tokens":181,"cache_read_input_tokens":14566,"cache_creation":{"ephemeral_5m_input_tokens":181,"ephemeral_1h_input_tokens":0},"output_tokens":4,"service_tier":"standard"}},"requestId":"req_011CUKdDSzjdQDj5azZsPxFW","type":"assistant","uuid":"6dd808e1-5323-4917-a73a-2cb7b3eb13f5","timestamp":"2025-10-21T03:22:00.061Z"}';

  it('should parse real user message', () => {
    const result = parse(realUserMessage);

    expect(result).not.toBeNull();
    expect(result?.role).toBe('user');
    expect(result?.tool).toBe('claude');
    expect(result?.id).toBe('40100391-dfab-4f01-8ce8-7c6f2b1a5e8c');
    expect(result?.content).toHaveLength(1);

    if (Array.isArray(result?.content)) {
      const block = result.content[0];
      expect(block?.type).toBe('text');
      if (block?.type === 'text') {
        expect(block.text).toBe('Hey');
      }
    }
  });

  it('should parse real assistant message with text content', () => {
    const result = parse(realAssistantMessage);

    expect(result).not.toBeNull();
    expect(result?.role).toBe('assistant');
    expect(result?.model).toBe('claude-sonnet-4-5-20250929');
    expect(result?.content).toHaveLength(1);

    if (Array.isArray(result?.content)) {
      const block = result.content[0];
      expect(block?.type).toBe('text');
      if (block?.type === 'text') {
        expect(block.text).toContain('help you with whatever you need');
      }
    }
  });

  it('should parse real tool use message', () => {
    const result = parse(realToolUseMessage);

    expect(result).not.toBeNull();
    expect(result?.content).toHaveLength(1);

    if (Array.isArray(result?.content)) {
      const block = result.content[0];
      expect(block?.type).toBe('tool_use');
      if (block?.type !== 'tool_use') {
        throw new Error(`Expected tool_use block, got ${block?.type}`);
      }
      expect(block.id).toBe('toolu_01VZ4mZBZtXjHzEgB2dFd6Bs');
      expect(block.name).toBe('mcp__happy__change_title');
      expect(block.input).toEqual({ title: 'New Chat Session' });
    }
  });

  it('should parse usage data from real message', () => {
    const result = parse(realAssistantMessage);

    expect(result).not.toBeNull();
    expect(result?.usage).toBeDefined();
    expect(result?.usage?.inputTokens).toBe(3);
    expect(result?.usage?.outputTokens).toBe(1);
    expect(result?.usage?.totalTokens).toBe(4);
    expect(result?.usage?.cacheCreationTokens).toBe(3526);
    expect(result?.usage?.cacheReadTokens).toBe(11040);
  });

  it('should skip file-history-snapshot', () => {
    const line = '{"type":"file-history-snapshot","messageId":"123"}';
    const result = parse(line);
    expect(result).toBeNull();
  });

  it('should return null for invalid JSON', () => {
    const line = 'invalid json {';
    const result = parse(line);
    expect(result).toBeNull();
  });

  it('should return null when message is missing', () => {
    const line = '{"type":"user","timestamp":"2025-01-01T00:00:00Z","uuid":"user-222"}';
    const result = parse(line);
    expect(result).toBeNull();
  });

  // Additional test cases from sample.jsonl fixture
  it('should parse user message with tool_result content', () => {
    const result = parse(toolResultMessage);

    expect(result).not.toBeNull();
    expect(result?.role).toBe('user');
    expect(result?.content).toHaveLength(1);

    if (Array.isArray(result?.content)) {
      const block = result.content[0];
      expect(block?.type).toBe('tool_result');
      if (block?.type !== 'tool_result') {
        throw new Error(`Expected tool_result block, got ${block?.type}`);
      }
      expect(block.tool_use_id).toBe('toolu_01VZ4mZBZtXjHzEgB2dFd6Bs');
      expect(block.content).toBeDefined();
    }
  });

  it('should parse assistant message with Bash tool use', () => {
    const result = parse(bashToolMessage);

    expect(result).not.toBeNull();
    expect(result?.role).toBe('assistant');
    expect(result?.content).toHaveLength(1);

    if (Array.isArray(result?.content)) {
      const block = result.content[0];
      expect(block?.type).toBe('tool_use');
      if (block?.type !== 'tool_use') {
        throw new Error(`Expected tool_use block, got ${block?.type}`);
      }
      expect(block.name).toBe('Bash');
      expect(block.input).toBeDefined();
      expect(block.input.command).toContain('find');
      expect(block.input.description).toBe('List key files in the project');
    }
  });

  it('should parse assistant message with Read tool', () => {
    const result = parse(readToolMessage);

    expect(result).not.toBeNull();
    expect(result?.role).toBe('assistant');
    expect(result?.content).toHaveLength(1);

    if (Array.isArray(result?.content)) {
      const block = result.content[0];
      expect(block?.type).toBe('tool_use');
      if (block?.type !== 'tool_use') {
        throw new Error(`Expected tool_use block, got ${block?.type}`);
      }
      expect(block.name).toBe('Read');
      expect(block.input.file_path).toContain('package.json');
    }
  });

  it('should parse user message with complex toolUseResult metadata', () => {
    const result = parse(complexToolResult);

    expect(result).not.toBeNull();
    expect(result?.role).toBe('user');
    expect(result?.content).toHaveLength(1);

    if (Array.isArray(result?.content)) {
      const block = result.content[0];
      expect(block?.type).toBe('tool_result');
      if (block?.type !== 'tool_result') {
        throw new Error(`Expected tool_result block, got ${block?.type}`);
      }
      expect(block.tool_use_id).toBe('toolu_0116WEyb81Mah8Hb9u29YXyW');
      expect(block.content).toBeDefined();
    }
  });

  it('should parse assistant message with TodoWrite tool', () => {
    const result = parse(todoWriteMessage);

    expect(result).not.toBeNull();
    expect(result?.role).toBe('assistant');
    expect(result?.content).toHaveLength(1);

    if (Array.isArray(result?.content)) {
      const block = result.content[0];
      expect(block?.type).toBe('tool_use');
      if (block?.type !== 'tool_use') {
        throw new Error(`Expected tool_use block, got ${block?.type}`);
      }
      expect(block.name).toBe('TodoWrite');
      expect(block.input.todos).toBeDefined();
      expect(Array.isArray(block.input.todos)).toBe(true);
    }
  });

  it('should parse message with cache statistics', () => {
    const result = parse(messageWithCache);

    expect(result).not.toBeNull();
    expect(result?.usage).toBeDefined();
    expect(result?.usage?.inputTokens).toBe(3);
    expect(result?.usage?.outputTokens).toBe(4);
    expect(result?.usage?.cacheCreationTokens).toBe(181);
    expect(result?.usage?.cacheReadTokens).toBe(14566);
    expect(result?.usage?.totalTokens).toBe(7);
  });

  it('should preserve timestamp', () => {
    const result = parse(realUserMessage);

    expect(result).not.toBeNull();
    expect(result?.timestamp).toBeDefined();
    expect(typeof result?.timestamp).toBe('number');
  });

  it('should handle assistant message with text containing special characters', () => {
    const result = parse(messageWithSpecialChars);

    expect(result).not.toBeNull();
    expect(result?.content).toHaveLength(1);

    if (Array.isArray(result?.content)) {
      const block = result.content[0];
      expect(block?.type).toBe('text');
      if (block?.type === 'text') {
        expect(block.text).toContain('<options>');
        expect(block.text).toContain('Help me fix a bug');
      }
    }
  });

  // Type guard tests
  describe('type guards', () => {
    it('should correctly identify Bash tool with type guard', () => {
      const result = parse(bashToolMessage);
      expect(result).not.toBeNull();

      if (Array.isArray(result?.content)) {
        const block = result.content[0];
        if (block?.type === 'tool_use') {
          // Type guard narrows the input type
          if (block.name === 'Bash') {
            expect(block.input.command).toBeDefined();
            expect(block.input.description).toBeDefined();
            expect(typeof block.input.command).toBe('string');
          }
        }
      }
    });

    it('should correctly identify Read tool with type guard', () => {
      const result = parse(readToolMessage);
      expect(result).not.toBeNull();

      if (Array.isArray(result?.content)) {
        const block = result.content[0];
        if (block?.type === 'tool_use') {
          if (block.name === 'Read') {
            expect(block.input.file_path).toBeDefined();
            expect(typeof block.input.file_path).toBe('string');
          }
        }
      }
    });

    it('should correctly identify TodoWrite tool with type guard', () => {
      const result = parse(todoWriteMessage);
      expect(result).not.toBeNull();

      if (Array.isArray(result?.content)) {
        const block = result.content[0];
        if (block?.type === 'tool_use') {
          if (block.name === 'TodoWrite') {
            expect(block.input.todos).toBeDefined();
            expect(Array.isArray(block.input.todos)).toBe(true);
          }
        }
      }
    });

    it('should correctly identify MCP tool with name check', () => {
      const result = parse(realToolUseMessage);
      expect(result).not.toBeNull();

      if (Array.isArray(result?.content)) {
        const block = result.content[0];
        if (block?.type === 'tool_use') {
          if (block.name.startsWith('mcp__')) {
            expect(block.name).toBe('mcp__happy__change_title');
            expect(block.input.title).toBeDefined();
          }
        }
      }
    });
  });

  // AskUserQuestion tests
  describe('AskUserQuestion tool', () => {
    // Multi-question AskUserQuestion with both multiSelect: false and multiSelect: true
    const askUserQuestionMulti =
      '{"parentUuid":"4e479d93-51a9-4e21-b09d-6d38bea867f5","isSidechain":false,"userType":"external","cwd":"/Users/jnarowski/Dev/sourceborn/src/agent-workflows-monorepo-v2","sessionId":"06381696-0074-49f8-863e-6ad4fac507f9","version":"2.0.29","gitBranch":"fix/image-blocks","message":{"model":"claude-sonnet-4-5-20250929","id":"msg_019aZy4YRtPuPrG99oLrqtUa","type":"message","role":"assistant","content":[{"type":"tool_use","id":"toolu_01VEjCZtxeHL3UL4CNaqMyBa","name":"AskUserQuestion","input":{"questions":[{"question":"Which framework should we use?","header":"Framework","multiSelect":false,"options":[{"label":"React","description":"Popular library with large ecosystem"},{"label":"Vue","description":"Progressive framework, easy to learn"},{"label":"Svelte","description":"Compile-time framework, no virtual DOM"}]},{"question":"What styling approach do you prefer?","header":"Styling","multiSelect":false,"options":[{"label":"CSS Modules","description":"Scoped CSS files"},{"label":"Tailwind","description":"Utility-first CSS"},{"label":"Styled Components","description":"CSS-in-JS solution"}]},{"question":"Which features should we include?","header":"Features","multiSelect":true,"options":[{"label":"Dark mode","description":"Theme switching support"},{"label":"Animations","description":"UI transitions and effects"},{"label":"Accessibility","description":"ARIA labels and keyboard nav"}]}]}}],"stop_reason":null,"stop_sequence":null,"usage":{"input_tokens":3,"cache_creation_input_tokens":3620,"cache_read_input_tokens":24921,"cache_creation":{"ephemeral_5m_input_tokens":3620,"ephemeral_1h_input_tokens":0},"output_tokens":14,"service_tier":"standard"}},"requestId":"req_011CUdMUWG4L1a1n9Rr53776","type":"assistant","uuid":"82b73821-2d40-4030-ac18-f0413121c1a7","timestamp":"2025-10-30T12:06:26.401Z"}';

    // User response to AskUserQuestion with toolUseResult metadata
    const askUserQuestionResponse =
      '{"parentUuid":"82b73821-2d40-4030-ac18-f0413121c1a7","isSidechain":false,"userType":"external","cwd":"/Users/jnarowski/Dev/sourceborn/src/agent-workflows-monorepo-v2","sessionId":"06381696-0074-49f8-863e-6ad4fac507f9","version":"2.0.29","gitBranch":"fix/image-blocks","type":"user","message":{"role":"user","content":[{"type":"tool_result","content":"User has answered your questions: \\"Which framework should we use?\\"=\\"React\\", \\"What styling approach do you prefer?\\"=\\"Tailwind\\", \\"Which features should we include?\\"=\\"Dark mode, Accessibility\\". You can now continue with the user\'s answers in mind.","tool_use_id":"toolu_01VEjCZtxeHL3UL4CNaqMyBa"}]},"uuid":"f2da9f56-7f63-4fa2-89dd-b3df134e2b1b","timestamp":"2025-10-30T12:12:39.753Z","toolUseResult":{"questions":[{"question":"Which framework should we use?","header":"Framework","options":[{"label":"React","description":"Popular library with large ecosystem"},{"label":"Vue","description":"Progressive framework, easy to learn"},{"label":"Svelte","description":"Compile-time framework, no virtual DOM"}],"multiSelect":false},{"question":"What styling approach do you prefer?","header":"Styling","options":[{"label":"CSS Modules","description":"Scoped CSS files"},{"label":"Tailwind","description":"Utility-first CSS"},{"label":"Styled Components","description":"CSS-in-JS solution"}],"multiSelect":false},{"question":"Which features should we include?","header":"Features","options":[{"label":"Dark mode","description":"Theme switching support"},{"label":"Animations","description":"UI transitions and effects"},{"label":"Accessibility","description":"ARIA labels and keyboard nav"}],"multiSelect":true}],"answers":{"Which framework should we use?":"React","What styling approach do you prefer?":"Tailwind","Which features should we include?":"Dark mode, Accessibility"}}}';

    it('should parse multi-question AskUserQuestion tool use', () => {
      const result = parse(askUserQuestionMulti);

      expect(result).not.toBeNull();
      expect(result?.role).toBe('assistant');
      expect(result?.content).toHaveLength(1);

      if (Array.isArray(result?.content)) {
        const block = result.content[0];
        expect(block?.type).toBe('tool_use');
        if (block?.type !== 'tool_use') {
          throw new Error(`Expected tool_use block, got ${block?.type}`);
        }
        expect(block.name).toBe('AskUserQuestion');
        expect(block.input.questions).toBeDefined();
        expect(Array.isArray(block.input.questions)).toBe(true);

        // Type assertion after verifying the tool name
        const questions = block.input.questions as Array<{
          question: string;
          header: string;
          multiSelect: boolean;
          options: Array<{ label: string; description: string }>;
        }>;
        expect(questions).toHaveLength(3);

        // Verify first question (multiSelect: false)
        const firstQuestion = questions[0];
        expect(firstQuestion).toBeDefined();
        expect(firstQuestion?.question).toBe('Which framework should we use?');
        expect(firstQuestion?.header).toBe('Framework');
        expect(firstQuestion?.multiSelect).toBe(false);
        expect(firstQuestion?.options).toHaveLength(3);

        // Verify third question (multiSelect: true)
        const thirdQuestion = questions[2];
        expect(thirdQuestion).toBeDefined();
        expect(thirdQuestion?.multiSelect).toBe(true);
        expect(thirdQuestion?.header).toBe('Features');
      }
    });

    it('should parse AskUserQuestion tool result with answers', () => {
      const result = parse(askUserQuestionResponse);

      expect(result).not.toBeNull();
      expect(result?.role).toBe('user');
      expect(result?.content).toHaveLength(1);

      if (Array.isArray(result?.content)) {
        const block = result.content[0];
        expect(block?.type).toBe('tool_result');
        if (block?.type !== 'tool_result') {
          throw new Error(`Expected tool_result block, got ${block?.type}`);
        }
        expect(block.tool_use_id).toBe('toolu_01VEjCZtxeHL3UL4CNaqMyBa');
        expect(block.content).toBeDefined();
        expect(typeof block.content).toBe('string');
        if (typeof block.content === 'string') {
          expect(block.content).toContain('React');
          expect(block.content).toContain('Tailwind');
        }
      }
    });

    it('should correctly identify AskUserQuestion tool with type guard', () => {
      const result = parse(askUserQuestionMulti);
      expect(result).not.toBeNull();

      if (Array.isArray(result?.content)) {
        const block = result.content[0];
        if (block?.type === 'tool_use') {
          if (block.name === 'AskUserQuestion') {
            expect(block.input.questions).toBeDefined();
            expect(Array.isArray(block.input.questions)).toBe(true);
            const questions = block.input.questions as Array<{
              question: string;
              header: string;
              multiSelect: boolean;
              options: Array<{ label: string; description: string }>;
            }>;
            expect(questions[0]?.question).toBeTruthy();
            expect(questions[0]?.header).toBeTruthy();
            expect(typeof questions[0]?.multiSelect).toBe('boolean');
          }
        }
      }
    });
  });

  // Slash command tests
  describe('slash commands', () => {
    // User message with slash command (no args)
    const slashCommandNoArgs =
      '{"parentUuid":"2335eb3e-0ec2-44dd-8fde-522f665767be","isSidechain":false,"userType":"external","cwd":"/Users/jnarowski/Dev/sourceborn/src/agent-workflows-monorepo-v2","sessionId":"2d984148-cddb-4605-aac1-13e720fe613c","version":"2.0.27","gitBranch":"feat/final-react-refactor-v2","type":"user","message":{"role":"user","content":"<command-name>/clear</command-name>\\n            <command-message>clear</command-message>\\n            <command-args></command-args>"},"uuid":"8470dfec-6c0e-419e-a7bc-937e177ebdc3","timestamp":"2025-10-26T10:38:08.687Z"}';

    // User message with slash command (with args)
    const slashCommandWithArgs =
      '{"parentUuid":"5a289ca7-2029-49f5-82c1-14818eca4896","isSidechain":false,"userType":"external","cwd":"/Users/jnarowski/Dev/sourceborn/src/agent-workflows-monorepo-v2","sessionId":"33ae3837-255e-4ccf-aea4-90e8bf675372","version":"2.0.28","gitBranch":"feat/agent-cli-sdk-revamp-v3","type":"user","message":{"role":"user","content":"<command-message>generate-feature is running…</command-message>\\n<command-name>/generate-feature</command-name>\\n<command-args>\\"a\\" \\"b\\"</command-args>"},"uuid":"091f5c55-fa08-42c5-a2e7-5d21f88e656e","timestamp":"2025-10-28T11:46:48.673Z"}';

    it('should parse slash command without args', () => {
      const result = parse(slashCommandNoArgs);

      expect(result).not.toBeNull();
      expect(result?.role).toBe('user');
      expect(result?.content).toHaveLength(1);

      if (Array.isArray(result?.content)) {
        const block = result.content[0];
        expect(block?.type).toBe('slash_command');
        if (block?.type !== 'slash_command') {
          throw new Error(`Expected slash_command block, got ${block?.type}`);
        }
        expect(block.command).toBe('/clear');
        expect(block.message).toBe('clear');
        expect(block.args).toBe('');
      }
    });

    it('should parse slash command with args', () => {
      const result = parse(slashCommandWithArgs);

      expect(result).not.toBeNull();
      expect(result?.role).toBe('user');
      expect(result?.content).toHaveLength(1);

      if (Array.isArray(result?.content)) {
        const block = result.content[0];
        expect(block?.type).toBe('slash_command');
        if (block?.type !== 'slash_command') {
          throw new Error(`Expected slash_command block, got ${block?.type}`);
        }
        expect(block.command).toBe('/generate-feature');
        expect(block.message).toBe('generate-feature is running…');
        expect(block.args).toBe('"a" "b"');
      }
    });

    it('should handle user message without slash command', () => {
      const result = parse(realUserMessage);

      expect(result).not.toBeNull();
      expect(result?.content).toHaveLength(1);

      if (Array.isArray(result?.content)) {
        const block = result.content[0];
        expect(block?.type).toBe('text');
        if (block?.type !== 'text') {
          throw new Error(`Expected text block, got ${block?.type}`);
        }
        expect(block.text).toBe('Hey');
      }
    });
  });

  // Image tests
  describe('image content', () => {
    // User message with image and text
    const userImageMessage =
      '{"parentUuid":null,"isSidechain":false,"userType":"external","cwd":"/Users/test/project","sessionId":"bb32e6fc-9893-4839-b1de-646fdb1437d1","version":"2.0.55","gitBranch":"main","type":"user","message":{"role":"user","content":[{"type":"image","source":{"type":"base64","data":"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==","media_type":"image/png"}},{"type":"text","text":"What is this an image of?"}]},"uuid":"dc5a6759-e7a3-493e-9294-b53602fe7b2c","timestamp":"2025-11-29T13:00:01.605Z"}';

    // Tool result containing image
    const toolResultWithImage =
      '{"parentUuid":"15558e5d-f971-4fe7-99b7-136d5d4a8a59","isSidechain":false,"userType":"external","cwd":"/Users/test/project","sessionId":"bb32e6fc-9893-4839-b1de-646fdb1437d1","version":"2.0.55","gitBranch":"main","type":"user","message":{"role":"user","content":[{"tool_use_id":"toolu_01JPVq3KWLjR86hgLCGRXQv7","type":"tool_result","content":[{"type":"image","source":{"type":"base64","data":"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==","media_type":"image/png"}}]}]},"uuid":"847b23a7-5a53-4b10-a910-5debf7a9ef54","timestamp":"2025-11-29T13:01:43.989Z"}';

    it('should parse user message with image content', () => {
      const result = parse(userImageMessage);

      expect(result).not.toBeNull();
      expect(result?.role).toBe('user');
      expect(result?.content).toHaveLength(2);

      if (Array.isArray(result?.content)) {
        // First block should be image
        const imageBlock = result.content[0];
        expect(imageBlock?.type).toBe('image');
        if (imageBlock?.type !== 'image') {
          throw new Error(`Expected image block, got ${imageBlock?.type}`);
        }
        expect(imageBlock.source.type).toBe('base64');
        expect(imageBlock.source.media_type).toBe('image/png');
        expect(imageBlock.source.data.length).toBeGreaterThan(0);

        // Second block should be text
        const textBlock = result.content[1];
        expect(textBlock?.type).toBe('text');
        if (textBlock?.type !== 'text') {
          throw new Error(`Expected text block, got ${textBlock?.type}`);
        }
        expect(textBlock.text).toBe('What is this an image of?');
      }
    });

    it('should parse tool result containing image', () => {
      const result = parse(toolResultWithImage);

      expect(result).not.toBeNull();
      expect(result?.role).toBe('user');
      expect(result?.content).toHaveLength(1);

      if (Array.isArray(result?.content)) {
        const block = result.content[0];
        expect(block?.type).toBe('tool_result');
        if (block?.type !== 'tool_result') {
          throw new Error(`Expected tool_result block, got ${block?.type}`);
        }
        expect(block.tool_use_id).toBe('toolu_01JPVq3KWLjR86hgLCGRXQv7');
        expect(block.content).toBeDefined();
        // The content is an array with an image block
        expect(Array.isArray(block.content)).toBe(true);
      }
    });

    it('should correctly identify image block with type guard', () => {
      const result = parse(userImageMessage);
      expect(result).not.toBeNull();

      if (Array.isArray(result?.content)) {
        const block = result.content[0];
        if (block?.type === 'image') {
          expect(block.source).toBeDefined();
          expect(block.source.type).toBe('base64');
          expect(block.source.media_type).toBe('image/png');
          expect(typeof block.source.data).toBe('string');
        }
      }
    });
  });
});
