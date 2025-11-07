# Tool Result Matching Pattern

## Overview

All tool results in the web app are automatically matched to their tool invocations via `tool_use_id` using a centralized enrichment function. This document describes the standardized pattern that **all tools must follow** to ensure consistent behavior and maintainability.

## The Core Pattern

**Key Principle:** Tool results are matched to tool invocations by building a Map of `tool_use_id` → `result`, then nesting results into their parent `tool_use` blocks. This happens **once** during message loading, not on every render.

### Why This Pattern?

1. **Performance**: Matching happens once, not on every render
2. **Simplicity**: Components don't need to search for their results
3. **Type Safety**: Results are strongly typed at the component level
4. **Consistency**: All tools work the same way
5. **Maintainability**: Single source of truth for the matching logic

## Data Flow

```
JSONL Files
    ↓
Parse to UnifiedMessage[]
    ↓
enrichMessagesWithToolResults()
    ↓
Build Map<tool_use_id, result>
    ↓
Nest results into tool_use blocks
    ↓
Filter out standalone tool_result blocks
    ↓
Enriched Messages
    ↓
ToolBlockRenderer
    ↓
Specific ToolBlock Component
```

## The Enrichment Process

### Location

`apps/web/src/client/pages/projects/sessions/stores/sessionStore.ts`

Function: `enrichMessagesWithToolResults(messages: UnifiedMessage[]): UIMessage[]`

### Process Steps

#### 1. Filter System Messages

Remove messages containing only system content (caveats, command tags, etc.):

```typescript
const filteredMessages = messages.filter((msg) => {
  // Skip messages with only system content blocks
  if (Array.isArray(content)) {
    const textBlocks = content.filter((c) => c.type === "text");
    if (textBlocks.length === 0) return true;
    return !textBlocks.every((c) => isSystemMessage(c.text));
  }
  return true;
});
```

#### 2. Build Result Map

**This is the core matching logic:**

```typescript
const resultMap = new Map<
  string,
  {
    content: string | UnifiedImageBlock;
    is_error?: boolean;
  }
>();

for (const message of filteredMessages) {
  if (Array.isArray(message.content)) {
    for (const block of message.content) {
      if (block.type === "tool_result") {
        resultMap.set(block.tool_use_id, {
          content: tryParseImageContent(block.content),
          is_error: block.is_error,
        });
      }
    }
  }
}
```

**Key Points:**

- Iterates through ALL messages
- Finds all `tool_result` blocks
- Creates a Map using `tool_use_id` as the key
- Parses content (images are auto-parsed to `UnifiedImageBlock`)

#### 3. Enrich and Filter

```typescript
return filteredMessages.map((msg) => {
  if (!Array.isArray(msg.content)) {
    return { ...msg, isStreaming: false };
  }

  const enrichedContent = msg.content
    .map((block) => {
      // Nest result into tool_use block
      if (block.type === "tool_use") {
        const result = resultMap.get(block.id);
        return result ? { ...block, result } : block;
      }
      return block;
    })
    // Filter out standalone tool_result blocks (now nested)
    .filter((block) => block.type !== "tool_result");

  return {
    ...msg,
    content: enrichedContent,
    isStreaming: false,
  } as UIMessage;
});
```

**Result:**

- Tool results are nested inside their parent `tool_use` blocks
- Standalone `tool_result` blocks are removed
- User messages containing **only** `tool_result` blocks disappear entirely

## Data Structures: Before and After

### Before Enrichment

Two separate messages:

```typescript
[
  // Assistant message with tool invocation
  {
    id: "msg-1",
    role: "assistant",
    content: [
      { type: "text", text: "Let me read that file" },
      {
        type: "tool_use",
        id: "tool_abc123",
        name: "Read",
        input: { file_path: "/path/to/image.png" },
      },
    ],
  },
  // User message with tool result (will be filtered out)
  {
    id: "msg-2",
    role: "user",
    content: [
      {
        type: "tool_result",
        tool_use_id: "tool_abc123",
        content: '[{"type":"image","source":{...}}]', // Stringified
      },
    ],
  },
];
```

### After Enrichment

One message with nested result:

```typescript
[
  {
    id: 'msg-1',
    role: 'assistant',
    content: [
      { type: 'text', text: 'Let me read that file' },
      {
        type: 'tool_use',
        id: 'tool_abc123',
        name: 'Read',
        input: { file_path: '/path/to/image.png' },
        result: {
          content: { type: 'image', source: {...} },  // ✨ Parsed!
          is_error: false
        }
      }
    ],
    isStreaming: false
  }
  // msg-2 removed entirely ✂️
]
```

## Special Content Types

### Images: Auto-Parsed

Images stored as stringified JSON arrays in JSONL files are automatically parsed to `UnifiedImageBlock` objects:

```typescript
// In JSONL file (stringified)
"content": "[{\"type\":\"image\",\"source\":{\"type\":\"base64\",\"data\":\"...\",\"media_type\":\"image/png\"}}]"

// After enrichment (parsed object)
content: {
  type: 'image',
  source: {
    type: 'base64',
    data: '...',
    media_type: 'image/png'
  }
}
```

**Function:** `tryParseImageContent()` in `sessionStore.ts`

### JSON Answers: Parse in Component

Other structured data (like AskUserQuestion answers) stays as strings and should be parsed in the component:

```typescript
// In JSONL file
"content": "User has answered your questions: \"Q1\"=\"A1\", \"Q2\"=\"A2\"..."

// After enrichment (still a string)
content: "User has answered your questions: \"Q1\"=\"A1\", \"Q2\"=\"A2\"..."

// Component parses it
const answers = parseAnswerString(result.content);
```

**Why?** Only images need to be universally parsed. Other formats are tool-specific and should be handled by the tool's renderer.

## Implementing a New Tool

### 1. Define Input Type

Already done if following the SDK pattern. Example:

```typescript
// In @repo/agent-cli-sdk/src/types/unified.ts
export interface MyToolInput {
  someParam: string;
  anotherParam?: number;
}
```

### 2. Create ToolBlock Component

**Location:** `apps/web/src/client/pages/projects/sessions/components/session/claude/blocks/MyToolBlock.tsx`

**Template:**

```typescript
import { ToolCollapsibleWrapper } from "../ToolCollapsibleWrapper";
import { MyToolRenderer } from "../tools/MyToolRenderer";
import type { MyToolInput } from "@/shared/types/tool.types";
import type { UnifiedImageBlock } from '@repo/agent-cli-sdk';

interface MyToolBlockProps {
  input: MyToolInput;
  result?: {
    content: string | UnifiedImageBlock;
    is_error?: boolean;
  };
}

export function MyToolBlock({ input, result }: MyToolBlockProps) {
  // Optional: Calculate contextInfo or description from input
  const contextInfo = input.someParam;
  const description = result ? 'Completed' : 'Running...';

  return (
    <ToolCollapsibleWrapper
      toolName="My Tool"
      contextInfo={contextInfo}
      description={description}
      hasError={result?.is_error}
      defaultOpen={false}  // or true for important tools
    >
      <MyToolRenderer input={input} result={result} />
    </ToolCollapsibleWrapper>
  );
}
```

### 3. Create Tool Renderer

**Location:** `apps/web/src/client/pages/projects/sessions/components/session/claude/tools/MyToolRenderer.tsx`

**Template:**

```typescript
import type { MyToolInput } from "@/shared/types/tool.types";
import type { UnifiedImageBlock } from '@repo/agent-cli-sdk';

interface MyToolRendererProps {
  input: MyToolInput;
  result?: {
    content: string | UnifiedImageBlock;
    is_error?: boolean;
  };
}

export function MyToolRenderer({ input, result }: MyToolRendererProps) {
  // Parse result.content if needed
  let parsedData = null;
  if (result && typeof result.content === 'string') {
    try {
      parsedData = JSON.parse(result.content);
    } catch {
      // Handle parse errors - result.content is plain text
      parsedData = { text: result.content };
    }
  }

  return (
    <div className="space-y-2">
      {/* Display input params */}
      <div className="text-sm">
        Parameter: {input.someParam}
      </div>

      {/* Display result if available */}
      {result && (
        <div className={`p-3 rounded-md ${result.is_error ? 'bg-red-50' : 'bg-muted/50'}`}>
          <pre className="text-xs">
            {typeof result.content === 'string'
              ? result.content
              : JSON.stringify(result.content, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
```

### 4. Register in ToolBlockRenderer

**Location:** `apps/web/src/client/pages/projects/sessions/components/session/claude/ToolBlockRenderer.tsx`

```typescript
import { MyToolBlock } from './blocks/MyToolBlock';
import type { MyToolInput } from '@/shared/types/tool.types';

// In the switch statement
case 'MyTool':
  return <MyToolBlock input={input as MyToolInput} result={result} />;
```

### 5. That's It!

**No manual tool_use_id matching required.** The enrichment process handles everything automatically.

## Common Patterns

### Pattern 1: Simple Text Result

**Example:** Bash tool output

```typescript
export function BashToolRenderer({ input, result }: BashToolRendererProps) {
  return (
    <div>
      <div className="font-mono text-sm">$ {input.command}</div>
      {result && (
        <pre className="mt-2 p-3 bg-black text-green-400">
          {typeof result.content === 'string' ? result.content : JSON.stringify(result.content)}
        </pre>
      )}
    </div>
  );
}
```

### Pattern 2: Structured JSON Result

**Example:** AskUserQuestion answers

```typescript
function parseAnswerString(content: string): Record<string, string> {
  // Custom parser for the specific format
  const answers: Record<string, string> = {};
  const prefix = "User has answered your questions: ";
  if (!content.startsWith(prefix)) return answers;

  const answersText = content.slice(prefix.length);
  const pairRegex = /"([^"]+)"="([^"]+?)"/g;
  let match;

  while ((match = pairRegex.exec(answersText)) !== null) {
    answers[match[1]] = match[2];
  }

  return answers;
}

export function AskUserQuestionToolRenderer({ input, result }: Props) {
  let answers: Record<string, string> = {};
  if (result && typeof result.content === "string") {
    answers = parseAnswerString(result.content);
  }

  // Render with parsed answers...
}
```

### Pattern 3: Image Result

**Example:** Read tool with image

```typescript
export function ReadToolBlock({ input, result }: ReadToolBlockProps) {
  // Type guard for image content
  const isImageContent = (content: string | UnifiedImageBlock): content is UnifiedImageBlock => {
    return typeof content === 'object' && content.type === 'image';
  };

  return (
    <ToolCollapsibleWrapper toolName="Read" contextInfo={input.file_path}>
      {result && !result.is_error && isImageContent(result.content) && (
        <ImageBlock image={result.content} alt={input.file_path} />
      )}
      {result && !result.is_error && !isImageContent(result.content) && (
        <pre>{result.content}</pre>
      )}
    </ToolCollapsibleWrapper>
  );
}
```

## Testing Your Tool

### Unit Test Template

**Location:** Create test file next to your renderer:
`apps/web/src/client/pages/projects/sessions/components/session/claude/tools/MyToolRenderer.test.tsx`

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MyToolBlock } from './MyToolBlock';
import type { MyToolInput } from '@/shared/types/tool.types';

describe('MyToolBlock', () => {
  it('renders tool input correctly', () => {
    const input: MyToolInput = {
      someParam: 'test value',
    };

    render(<MyToolBlock input={input} />);

    expect(screen.getByText('test value')).toBeInTheDocument();
  });

  it('displays result when available', () => {
    const input: MyToolInput = {
      someParam: 'test value',
    };

    const result = {
      content: 'Tool execution result',
      is_error: false,
    };

    render(<MyToolBlock input={input} result={result} />);

    expect(screen.getByText('Tool execution result')).toBeInTheDocument();
  });

  it('shows error state when result has error', () => {
    const input: MyToolInput = {
      someParam: 'test value',
    };

    const result = {
      content: 'Error message',
      is_error: true,
    };

    render(<MyToolBlock input={input} result={result} />);

    expect(screen.getByText('Error message')).toBeInTheDocument();
  });
});
```

### Integration Testing

The enrichment process is thoroughly tested in:
`apps/web/src/client/pages/projects/sessions/stores/enrichMessagesWithToolResults.test.ts`

When adding a new tool, you generally **don't need** to test the enrichment process again, just verify your component renders correctly with the enriched data.

## Critical Principles

### ✅ DO

1. **Follow the standard pattern** - Use `{ input, result }` props
2. **Parse in component** - Handle tool-specific formats in your renderer
3. **Use type guards** - Check content type before using (especially for images)
4. **Handle missing results** - Tools may not have results yet (streaming)
5. **Handle errors** - Check `result.is_error` flag

### ❌ DON'T

1. **Don't search for tool_use_id** - Results are already nested
2. **Don't modify enrichment** - Unless adding a new universal content type
3. **Don't parse in enrichment** - Tool-specific parsing belongs in components
4. **Don't assume result exists** - Always check if result is defined
5. **Don't mutate messages** - Treat enriched messages as immutable

## Troubleshooting

### My tool result isn't showing

**Check:**

1. Is `tool_use_id` in the result matching the `id` in the tool_use?
2. Is the result being filtered out by `isSystemMessage()`?
3. Are you checking for `result` existence before rendering?
4. Is your tool registered in `ToolBlockRenderer` switch statement?

**Debug:**

```typescript
console.log("Tool input:", input);
console.log("Tool result:", result);
console.log("Result content type:", typeof result?.content);
```

### My result content is always a string

**This is expected!** Only images are auto-parsed. For other formats:

```typescript
if (result && typeof result.content === "string") {
  try {
    const parsed = JSON.parse(result.content);
    // Use parsed data
  } catch {
    // Content is not JSON, use as plain text
  }
}
```

### User message with my tool result is missing

**This is also expected!** User messages containing only `tool_result` blocks are filtered out after enrichment. The result is nested into the assistant's `tool_use` block instead.

If you need the user message to appear in the timeline, you'll need to:

1. Special-case it in the enrichment filter
2. Create a custom message renderer
3. Handle both the nested result AND the user message display

## Examples in the Codebase

### Image Tool (Auto-Parse)

- **Block:** `apps/web/src/client/pages/projects/sessions/components/session/claude/blocks/ReadToolBlock.tsx`
- **Renderer:** `apps/web/src/client/pages/projects/sessions/components/session/claude/ImageBlock.tsx`
- **Pattern:** Type guard + auto-parsed content

### AskUserQuestion (Custom Parse)

- **Block:** `apps/web/src/client/pages/projects/sessions/components/session/claude/blocks/AskUserQuestionToolBlock.tsx`
- **Renderer:** `apps/web/src/client/pages/projects/sessions/components/session/claude/tools/AskUserQuestionToolRenderer.tsx`
- **Pattern:** Custom string parser + answer highlighting

### Bash (Plain Text)

- **Block:** `apps/web/src/client/pages/projects/sessions/components/session/claude/blocks/BashToolBlock.tsx`
- **Renderer:** `apps/web/src/client/pages/projects/sessions/components/session/claude/tools/BashToolRenderer.tsx`
- **Pattern:** Direct string display with styling

## Summary

The tool result matching pattern provides a **standardized, performant, and maintainable** way to connect tool invocations with their results. By following this pattern:

1. **Your components stay simple** - Just render `{ input, result }`
2. **Performance is optimized** - Matching happens once, not on every render
3. **Code is consistent** - All tools work the same way
4. **Testing is easier** - Clear contract between data and UI

When implementing a new tool, you should **never** manually search for tool results or use `tool_use_id` for matching. The enrichment process handles all of that automatically.
