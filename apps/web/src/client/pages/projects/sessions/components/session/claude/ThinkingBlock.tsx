/**
 * Thinking/reasoning block
 * Collapsible display of Claude's internal reasoning
 */

import { useState } from "react";
import { Button } from "@/client/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/client/components/ui/collapsible";
import { ToolDot } from "./components/ToolDot";

interface ThinkingBlockProps {
  thinking: string;
  className?: string;
}

export function ThinkingBlock({ thinking, className = '' }: ThinkingBlockProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Extract first sentence for description
  const getFirstSentence = (text: string): string => {
    // Match first sentence (ending with . ! or ?)
    const match = text.match(/^[^.!?]+[.!?]/);
    if (match) {
      return match[0].trim();
    }
    // Fallback to first 100 chars
    return text.slice(0, 100) + (text.length > 100 ? '...' : '');
  };

  const description = getFirstSentence(thinking);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className={className}>
      {/* Header */}
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          className="w-full justify-start px-0 py-1.5 hover:bg-transparent h-auto"
        >
          <div className="flex items-start gap-2.5 w-full min-w-0">
            <div className="flex items-center h-5">
              <ToolDot color="bg-purple-600 dark:bg-purple-400" />
            </div>
            <div className="flex flex-col items-start gap-0.5 min-w-0 flex-1">
              <div className="flex items-center gap-2 w-full min-w-0">
                <span className="text-base md:text-sm font-semibold">Thinking</span>
              </div>
              <span className="text-sm md:text-xs text-muted-foreground break-words max-w-full overflow-hidden">
                ↳ {description}
              </span>
            </div>
          </div>
        </Button>
      </CollapsibleTrigger>

      {/* Content */}
      <CollapsibleContent>
        <div className="pl-5 pt-2 pb-3">
          <pre className="whitespace-pre-wrap break-words text-base md:text-sm italic text-muted-foreground font-sans">
            {thinking}
          </pre>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
