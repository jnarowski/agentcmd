/**
 * Renderer for tool results
 * Shows output with error/success styling
 * Detects permission denials and shows inline approval UI
 */

import { useState } from 'react';
import { AlertCircle, CheckCircle2, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from "@/client/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/client/components/ui/collapsible";
import type { UnifiedImageBlock } from 'agent-cli-sdk';
import { PermissionDenialBlock } from '../blocks/PermissionDenialBlock';
import { useSessionStore } from '@/client/pages/projects/sessions/stores/sessionStore';

interface ToolResultRendererProps {
  toolUseId: string;
  toolName: string;
  input: Record<string, unknown>;
  result: string | UnifiedImageBlock;
  isError?: boolean;
  onApprove?: (toolUseId: string) => void;
}

const MAX_LENGTH_BEFORE_COLLAPSE = 500;

/**
 * Detect if error is a permission denial
 * Claude CLI returns: "Claude requested permissions to {action} {file}, but you haven't granted it yet."
 */
function isPermissionDenial(isError: boolean, result: string | UnifiedImageBlock): boolean {
  if (!isError) return false;
  if (typeof result !== 'string') return false;
  return result.includes('requested permissions');
}

/**
 * Extract permission details from tool input
 * Returns file path and operation details for Edit/Write tools
 */
interface PermissionDetails {
  filePath: string;
  oldString?: string;
  newString?: string;
}

function extractPermissionDetails(toolName: string, input: Record<string, unknown>): PermissionDetails | null {
  // Edit tool has file_path, old_string, new_string
  if (toolName === 'Edit') {
    return {
      filePath: (input.file_path as string) || 'unknown',
      oldString: input.old_string as string,
      newString: input.new_string as string,
    };
  }

  // Write tool has file_path and content
  if (toolName === 'Write') {
    return {
      filePath: (input.file_path as string) || 'unknown',
    };
  }

  // Bash tool has command
  if (toolName === 'Bash') {
    return {
      filePath: (input.command as string) || 'unknown command',
    };
  }

  return null;
}

export function ToolResultRenderer({
  toolUseId,
  toolName,
  input,
  result,
  isError = false,
  onApprove,
}: ToolResultRendererProps) {
  // Get handledPermissions from store to track if this permission was already handled
  const handledPermissions = useSessionStore((s) => s.handledPermissions);
  const markPermissionHandled = useSessionStore((s) => s.markPermissionHandled);

  // Check if this is a permission denial
  const isPermissionError = isPermissionDenial(isError, result);

  // Extract permission details if this is a permission denial
  const permissionDetails = isPermissionError ? extractPermissionDetails(toolName, input) : null;

  // Render PermissionDenialBlock if permission denial detected
  if (isPermissionError && permissionDetails && onApprove) {
    const isPending = handledPermissions.has(toolUseId);

    const handleApprove = () => {
      markPermissionHandled(toolUseId);
      onApprove(toolUseId);
    };

    const handleDeny = () => {
      markPermissionHandled(toolUseId);
      // Deny just marks as handled without calling onApprove
    };

    // Hide the block if already handled
    if (isPending) {
      return null;
    }

    return (
      <PermissionDenialBlock
        toolName={toolName}
        toolUseId={toolUseId}
        filePath={permissionDetails.filePath}
        oldString={permissionDetails.oldString}
        newString={permissionDetails.newString}
        onApprove={handleApprove}
        onDeny={handleDeny}
        isPending={isPending}
      />
    );
  }
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
