/**
 * Renderer for TodoWrite tool input
 * Shows full task list with status indicators
 */

import { Check, Circle } from "lucide-react";
import type { TodoWriteToolInput } from "@/shared/types/tool.types";

interface TodoWriteToolRendererProps {
  input: TodoWriteToolInput;
}

export function TodoWriteToolRenderer({ input }: TodoWriteToolRendererProps) {
  return (
    <div className="space-y-1">
      {input.todos.map((todo, index) => {
        const isCompleted = todo.status === "completed";
        const isInProgress = todo.status === "in_progress";

        const textStyle = isCompleted
          ? "text-muted-foreground line-through"
          : isInProgress
            ? "text-foreground font-medium"
            : "text-muted-foreground";

        return (
          <div key={index} className="flex items-start gap-2">
            {/* Checkbox */}
            <div
              className={`h-4 w-4 mt-0.5 flex-shrink-0 rounded border-2 flex items-center justify-center ${
                isCompleted
                  ? "bg-green-600 dark:bg-green-500 border-green-600 dark:border-green-500"
                  : isInProgress
                    ? "border-blue-600 dark:border-blue-400"
                    : "border-gray-400 dark:border-gray-600"
              }`}
            >
              {isCompleted && (
                <Check className="h-3 w-3 text-white" strokeWidth={3} />
              )}
              {isInProgress && (
                <Circle className="h-2 w-2 fill-blue-600 dark:fill-blue-400 text-blue-600 dark:text-blue-400" />
              )}
            </div>

            <span className={`text-sm ${textStyle}`}>{todo.content}</span>
          </div>
        );
      })}
    </div>
  );
}
