/**
 * Renderer for tool results
 * Shows output with error/success styling
 * Detects permission denials and shows inline approval UI
 */

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

  // Not a permission denial - return null and let the tool block handle its own result display
  return null;
}
