/**
 * Router for tool-specific input renderers
 * Dispatches to appropriate renderer based on tool name
 */

import type {
  EditToolInput,
  WriteToolInput,
  ReadToolInput,
  BashToolInput,
  TodoWriteToolInput,
  WebSearchToolInput,
} from "@/shared/types/tool.types";
import { EditToolRenderer } from "./EditToolRenderer";
import { WriteToolRenderer } from "./WriteToolRenderer";
import { ReadToolRenderer } from "./ReadToolRenderer";
import { BashToolRenderer } from "./BashToolRenderer";
import { TodoWriteToolRenderer } from "./TodoWriteToolRenderer";
import { WebSearchToolRenderer } from "./WebSearchToolRenderer";

interface ToolInputRendererProps {
  toolName: string;
  input: Record<string, unknown>;
}

/**
 * Render tool input based on tool name
 *
 * To add a new tool renderer:
 * 1. Create a new tool renderer component (e.g., MyToolRenderer.tsx)
 * 2. Import it here
 * 3. Add a case in the switch statement below
 * 4. Add the tool input type to tool.types.ts if needed
 *
 * @example
 * ```tsx
 * case 'MyTool':
 *   return <MyToolRenderer input={input as MyToolInput} />;
 * ```
 */
export function ToolInputRenderer({ toolName, input }: ToolInputRendererProps) {
  switch (toolName) {
    case "Edit":
      return <EditToolRenderer input={input as unknown as EditToolInput} />;

    case "Write":
      return <WriteToolRenderer input={input as unknown as WriteToolInput} />;

    case "Read":
      return <ReadToolRenderer input={input as unknown as ReadToolInput} />;

    case "Bash":
      return <BashToolRenderer input={input as unknown as BashToolInput} />;

    case "TodoWrite":
      return <TodoWriteToolRenderer input={input as unknown as TodoWriteToolInput} />;

    case "WebSearch":
      return <WebSearchToolRenderer input={input as unknown as WebSearchToolInput} />;

    case "Glob":
    case "Grep": {
      // Simple renderer for search tools
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const searchInput = input as any;
      return (
        <div className="text-base md:text-sm font-mono bg-muted/50 px-3 py-2 rounded-md border">
          <div className="text-muted-foreground">Pattern:</div>
          <div>{searchInput.pattern}</div>
          {searchInput.path && (
            <>
              <div className="text-muted-foreground mt-2">Path:</div>
              <div>{searchInput.path}</div>
            </>
          )}
        </div>
      );
    }

    default:
      // Fallback: display JSON for unknown tools
      return (
        <details className="text-base md:text-sm">
          <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
            View input
          </summary>
          <pre className="mt-2 p-3 rounded-md bg-muted/50 border overflow-x-auto text-sm md:text-xs">
            {JSON.stringify(input, null, 2)}
          </pre>
        </details>
      );
  }
}
