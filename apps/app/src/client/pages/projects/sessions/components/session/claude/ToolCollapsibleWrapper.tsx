/**
 * Reusable collapsible wrapper for tool blocks
 * Handles the collapsible UI logic while allowing tools to customize icon, title, and content
 * Automatically detects if content is empty and renders as non-interactive
 */

import { useState, type ReactNode, Children } from "react";
import { Button } from "@/client/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/client/components/ui/collapsible";
import { ToolDot } from "./components/ToolDot";
import { getToolColor } from "./utils/getToolColor";

interface ToolCollapsibleWrapperProps {
  toolName: string;
  contextInfo?: string | null;
  description?: string | null;
  hasError?: boolean;
  children: ReactNode;
  className?: string;
  defaultOpen?: boolean;
}

export function ToolCollapsibleWrapper({
  toolName,
  contextInfo,
  description,
  hasError = false,
  children,
  className = "",
  defaultOpen = false,
}: ToolCollapsibleWrapperProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const dotColor = getToolColor(toolName, hasError);

  // Check if children is empty/null
  const hasContent = Children.count(children) > 0 && children !== null && children !== undefined;

  // If no content, render as non-interactive
  if (!hasContent) {
    return (
      <div className={`${className} session-tool-block`}>
        <div className="flex items-start gap-2.5 w-full min-w-0 py-1.5 session-tool-header">
          <div className="flex items-center h-5 session-block-dot-wrapper">
            <ToolDot color={dotColor} />
          </div>
          <div className="flex flex-col items-start gap-0.5 min-w-0 flex-1">
            <div className="flex items-center gap-2 w-full min-w-0">
              <span className="text-base md:text-sm font-semibold session-tool-name">{toolName}</span>
              {contextInfo && (
                <span className="text-sm md:text-xs text-muted-foreground font-mono truncate session-tool-context">
                  {contextInfo}
                </span>
              )}
            </div>
            {description && (
              <span className="text-sm md:text-xs text-muted-foreground session-tool-description">
                ↳ {description}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className={`${className} session-tool-block`}>
      {/* Header */}
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          className="w-full justify-start px-0 py-1.5 hover:bg-transparent h-auto session-tool-header"
        >
          <div className="flex items-start gap-2.5 w-full min-w-0">
            <div className="flex items-center h-5 session-block-dot-wrapper">
              <ToolDot color={dotColor} />
            </div>
            <div className="flex flex-col items-start gap-0.5 min-w-0 flex-1">
              <div className="flex items-center gap-2 w-full min-w-0">
                <span className="text-base md:text-sm font-semibold session-tool-name">{toolName}</span>
                {contextInfo && (
                  <span className="text-sm md:text-xs text-muted-foreground font-mono truncate session-tool-context">
                    {contextInfo}
                  </span>
                )}
              </div>
              {description && (
                <span className="text-sm md:text-xs text-muted-foreground session-tool-description">
                  ↳ {description}
                </span>
              )}
            </div>
          </div>
        </Button>
      </CollapsibleTrigger>

      {/* Content */}
      <CollapsibleContent>
        <div className="pl-5 pt-2 pb-3 session-tool-content">{children}</div>
      </CollapsibleContent>
    </Collapsible>
  );
}
