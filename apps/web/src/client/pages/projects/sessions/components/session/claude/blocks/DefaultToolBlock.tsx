/**
 * Default fallback tool block component
 * Used for tools that don't have a custom Block component
 */

import { ToolCollapsibleWrapper } from "@/client/pages/projects/sessions/components/session/claude/ToolCollapsibleWrapper";
import { ToolResultRenderer } from "@/client/pages/projects/sessions/components/session/claude/tools/ToolResultRenderer";
import type { UnifiedImageBlock } from 'agent-cli-sdk';

interface DefaultToolBlockProps {
  toolName: string;
  input: Record<string, unknown>;
  result?: {
    content: string | UnifiedImageBlock;
    is_error?: boolean;
  };
}

export function DefaultToolBlock({
  toolName,
  input,
  result,
}: DefaultToolBlockProps) {
  return (
    <ToolCollapsibleWrapper
      toolName={toolName}
      contextInfo={null}
      description={null}
      hasError={result?.is_error}
    >
      <div className="space-y-3">
        {/* Tool Input */}
        <div className="space-y-2">
          <div className="text-sm md:text-xs font-semibold text-muted-foreground">
            Input
          </div>
          <details className="text-base md:text-sm">
            <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
              View input
            </summary>
            <pre className="mt-2 p-3 rounded-md bg-muted/50 border overflow-x-auto text-sm md:text-xs">
              {JSON.stringify(input, null, 2)}
            </pre>
          </details>
        </div>

        {/* Tool Result */}
        {result && (
          <div className="space-y-2">
            <div className="text-sm md:text-xs font-semibold text-muted-foreground">
              Output
            </div>
            <div className="border border-border rounded-md p-2 bg-background/50">
              <ToolResultRenderer
                result={result.content}
                isError={result.is_error}
              />
            </div>
          </div>
        )}
      </div>
    </ToolCollapsibleWrapper>
  );
}
