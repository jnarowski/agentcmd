/**
 * WebSearch tool block component
 */

import { ToolCollapsibleWrapper } from "@/client/pages/projects/sessions/components/session/claude/ToolCollapsibleWrapper";
import { ToolResultRenderer } from "@/client/pages/projects/sessions/components/session/claude/tools/ToolResultRenderer";
import type { WebSearchToolInput } from "@/shared/types/tool.types";
import type { UnifiedImageBlock } from 'agent-cli-sdk';

interface WebSearchToolBlockProps {
  input: WebSearchToolInput;
  result?: {
    content: string | UnifiedImageBlock;
    is_error?: boolean;
  };
}

export function WebSearchToolBlock({ input, result }: WebSearchToolBlockProps) {
  // For now, use a placeholder for result count
  // In a real implementation, we would parse the result to count search results
  const description = result && !result.is_error ? "Search results" : null;

  return (
    <ToolCollapsibleWrapper
      toolName="WebSearch"
      contextInfo={input.query}
      description={description}
      hasError={result?.is_error}
    >
      <div className="border border-border rounded-md p-2 bg-background/50">
        <ToolResultRenderer
          result={result?.content || ""}
          isError={result?.is_error}
        />
      </div>
    </ToolCollapsibleWrapper>
  );
}
