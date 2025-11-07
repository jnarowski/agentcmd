/**
 * Renderer for tool results
 * Shows output with error/success styling
 */

import { useState } from 'react';
import { AlertCircle, CheckCircle2, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from "@/client/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/client/components/ui/collapsible";
import type { UnifiedImageBlock } from 'agent-cli-sdk';

interface ToolResultRendererProps {
  result: string | UnifiedImageBlock;
  isError?: boolean;
}

const MAX_LENGTH_BEFORE_COLLAPSE = 500;

export function ToolResultRenderer({ result, isError = false }: ToolResultRendererProps) {
  // SAFETY: Ensure result is a string
  const safeResult = typeof result === 'string' ? result : JSON.stringify(result, null, 2);

  const shouldCollapse = safeResult.length > MAX_LENGTH_BEFORE_COLLAPSE;
  const [isOpen, setIsOpen] = useState(!shouldCollapse);

  const Icon = isError ? AlertCircle : CheckCircle2;
  const iconColor = isError ? 'text-red-500' : 'text-green-500';

  const content = (
    <div className="rounded-md border border-gray-200 dark:border-gray-800 overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-900/50">
        <Icon className={`h-4 w-4 ${iconColor} flex-shrink-0`} />
        <span className="text-base md:text-sm font-medium">
          {isError ? 'Error' : 'Success'}
        </span>
        {shouldCollapse && (
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="ml-auto h-6 px-2 rounded-sm">
              {isOpen ? (
                <>
                  <ChevronDown className="h-3 w-3 mr-1" />
                  Collapse
                </>
              ) : (
                <>
                  <ChevronRight className="h-3 w-3 mr-1" />
                  Expand
                </>
              )}
            </Button>
          </CollapsibleTrigger>
        )}
      </div>

      <div className="border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 px-3 py-2">
        <pre className="font-mono text-sm md:text-xs whitespace-pre-wrap break-words">
          {safeResult}
        </pre>
      </div>
    </div>
  );

  if (shouldCollapse) {
    return (
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleContent>
          {content}
        </CollapsibleContent>
      </Collapsible>
    );
  }

  return content;
}
