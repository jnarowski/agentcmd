/**
 * Renderer for WebSearch tool input
 * Shows search query and optional domain filters
 */

import { Search } from "lucide-react";
import type { WebSearchToolInput } from "@/shared/types/tool.types";

interface WebSearchToolRendererProps {
  input: WebSearchToolInput;
}

export function WebSearchToolRenderer({ input }: WebSearchToolRendererProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-start gap-2 rounded-md bg-muted/50 px-3 py-2 border">
        <Search className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <div className="text-sm font-medium">{input.query}</div>
          {input.allowed_domains && input.allowed_domains.length > 0 && (
            <div className="text-xs text-muted-foreground mt-1">
              <span className="font-medium">Allowed domains:</span> {input.allowed_domains.join(', ')}
            </div>
          )}
          {input.blocked_domains && input.blocked_domains.length > 0 && (
            <div className="text-xs text-muted-foreground mt-1">
              <span className="font-medium">Blocked domains:</span> {input.blocked_domains.join(', ')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
