/**
 * Permission approval UI component
 * Shows inline approve/deny buttons for file edits and bash operations
 */

import { useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/client/components/ui/button';

interface PermissionDenialBlockProps {
  toolName: string;
  toolUseId: string;
  filePath: string;
  oldString?: string;
  newString?: string;
  onApprove: () => void;
  onDeny: () => void;
  isPending: boolean;
}

export function PermissionDenialBlock({
  toolName,
  filePath,
  oldString,
  newString,
  onApprove,
  onDeny,
  isPending,
}: PermissionDenialBlockProps) {
  const [isDiffOpen, setIsDiffOpen] = useState(false);

  // Show diff only for Edit tool (has both old and new strings)
  const hasDiff = toolName === 'Edit' && oldString && newString;

  return (
    <div className="rounded-md border border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-950/20 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 bg-yellow-100 dark:bg-yellow-900/30 border-b border-yellow-200 dark:border-yellow-800">
        <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-500 flex-shrink-0" />
        <span className="text-sm font-medium text-yellow-900 dark:text-yellow-100">
          Permission Required
        </span>
      </div>

      {/* Content */}
      <div className="px-3 py-2 space-y-3">
        {/* File path */}
        <div className="text-sm text-gray-700 dark:text-gray-300">
          <span className="font-medium">{toolName}</span> operation on{' '}
          <code className="px-1 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-xs font-mono">
            {filePath}
          </code>
        </div>

        {/* Diff viewer for Edit operations */}
        {hasDiff && (
          <div className="border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden">
            <button
              onClick={() => setIsDiffOpen(!isDiffOpen)}
              className="flex items-center gap-2 w-full px-3 py-2 bg-gray-50 dark:bg-gray-900/50 hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors text-left"
            >
              {isDiffOpen ? (
                <ChevronDown className="h-3 w-3 text-gray-600 dark:text-gray-400" />
              ) : (
                <ChevronRight className="h-3 w-3 text-gray-600 dark:text-gray-400" />
              )}
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                View changes
              </span>
            </button>

            {isDiffOpen && (
              <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 p-3 space-y-2">
                {/* Old string */}
                <div>
                  <div className="text-xs font-semibold text-red-700 dark:text-red-400 mb-1">
                    - Remove
                  </div>
                  <pre className="text-xs font-mono bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded p-2 overflow-x-auto whitespace-pre-wrap break-words">
                    {oldString}
                  </pre>
                </div>

                {/* New string */}
                <div>
                  <div className="text-xs font-semibold text-green-700 dark:text-green-400 mb-1">
                    + Add
                  </div>
                  <pre className="text-xs font-mono bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900 rounded p-2 overflow-x-auto whitespace-pre-wrap break-words">
                    {newString}
                  </pre>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex items-center gap-2 pt-1">
          <Button
            onClick={onDeny}
            disabled={isPending}
            variant="ghost"
            size="sm"
            className="h-8 text-xs"
          >
            Deny
          </Button>
          <Button
            onClick={onApprove}
            disabled={isPending}
            size="sm"
            className="h-8 text-xs bg-yellow-600 hover:bg-yellow-700 text-white"
          >
            {isPending ? 'Approving...' : 'Approve'}
          </Button>
        </div>
      </div>
    </div>
  );
}
