/**
 * Renderer for Read tool input
 * Shows file reference with optional line range
 */

import { Eye } from "lucide-react";
import type { ReadToolInput } from "@/shared/types/tool.types";
import { FileReference } from "@/client/pages/projects/sessions/components/FileReference";

interface ReadToolRendererProps {
  input: ReadToolInput;
}

export function ReadToolRenderer({ input }: ReadToolRendererProps) {
  const hasRange = input.offset !== undefined || input.limit !== undefined;
  const startLine = input.offset || 0;
  const endLine = input.limit ? startLine + input.limit : undefined;

  return (
    <div className="flex items-start gap-2 rounded-md bg-muted/50 px-3 py-2 border">
      <Eye className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <FileReference
          filePath={input.file_path}
          lineNumber={startLine > 0 ? startLine : undefined}
        />
        {hasRange && endLine && (
          <div className="text-xs text-muted-foreground mt-1">
            Lines {startLine}-{endLine}
          </div>
        )}
      </div>
    </div>
  );
}
