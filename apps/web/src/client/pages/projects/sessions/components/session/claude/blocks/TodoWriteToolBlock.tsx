/**
 * TodoWrite tool block component
 */

import { ToolCollapsibleWrapper } from "@/client/pages/projects/sessions/components/session/claude/ToolCollapsibleWrapper";
import { TodoWriteToolRenderer } from "@/client/pages/projects/sessions/components/session/claude/tools/TodoWriteToolRenderer";
import type { TodoWriteToolInput } from "@/shared/types/tool.types";
import type { UnifiedImageBlock } from '@repo/agent-cli-sdk';

interface TodoWriteToolBlockProps {
  input: TodoWriteToolInput;
  result?: {
    content: string | UnifiedImageBlock;
    is_error?: boolean;
  };
}

export function TodoWriteToolBlock({ input, result }: TodoWriteToolBlockProps) {
  // Calculate completion summary
  const completedCount = input.todos.filter((t) => t.status === "completed")
    .length;
  const description = `${completedCount} / ${input.todos.length} todos completed`;

  return (
    <ToolCollapsibleWrapper
      toolName="Update Todos"
      contextInfo={null}
      description={description}
      hasError={result?.is_error}
      defaultOpen={true}
    >
      <TodoWriteToolRenderer input={input} />
    </ToolCollapsibleWrapper>
  );
}
