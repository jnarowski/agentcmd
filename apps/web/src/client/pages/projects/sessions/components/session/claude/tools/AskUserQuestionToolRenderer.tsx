/**
 * Renderer for AskUserQuestion tool input
 * Shows questions with their options in a card layout
 */

import { CheckCircle2, Circle } from "lucide-react";
import type { AskUserQuestionToolInput } from "@/shared/types/tool.types";
import type { UnifiedImageBlock } from "@repo/agent-cli-sdk";

interface AskUserQuestionToolRendererProps {
  input: AskUserQuestionToolInput;
  result?: {
    content: string | UnifiedImageBlock;
    is_error?: boolean;
  };
}

/**
 * Parse answer string from Claude CLI format
 * Format: "User has answered your questions: \"Q1\"=\"A1\", \"Q2\"=\"A2\"..."
 */
function parseAnswerString(content: string): Record<string, string> {
  const answers: Record<string, string> = {};

  // Extract the answers portion after the prefix
  const prefix = "User has answered your questions: ";
  if (!content.startsWith(prefix)) {
    return answers;
  }

  const answersText = content.slice(prefix.length);
  if (!answersText || answersText === ".") {
    return answers;
  }

  // Split by ", " but not within quoted strings
  // Use a regex to match "question"="answer" pairs
  const pairRegex = /"([^"]+)"="([^"]+?)"/g;
  let match;

  while ((match = pairRegex.exec(answersText)) !== null) {
    const question = match[1];
    const answer = match[2];
    answers[question] = answer;
  }

  return answers;
}

export function AskUserQuestionToolRenderer({
  input,
  result,
}: AskUserQuestionToolRendererProps) {
  // Parse answers from result if available
  let answers: Record<string, string> = {};
  if (result && typeof result.content === "string") {
    answers = parseAnswerString(result.content);
  }

  return (
    <div className="space-y-4">
      {input.questions.map((question, qIndex) => {
        // Get the selected answer for this question
        const selectedAnswer = answers[question.question] || null;

        return (
          <div key={qIndex} className="space-y-2">
            {/* Question header */}
            <div className="flex items-start gap-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {question.header}
              </span>
              {question.multiSelect && (
                <span className="text-xs text-muted-foreground">
                  (multi-select)
                </span>
              )}
            </div>

            {/* Question text */}
            <div className="text-sm font-medium text-foreground">
              {question.question}
            </div>

            {/* Options */}
            <div className="space-y-0.5">
              {question.options.map((option, oIndex) => {
                const isSelected = selectedAnswer === option.label;

                return (
                  <div key={oIndex} className="flex items-start gap-2 py-1">
                    {/* Selection indicator */}
                    <div className="mt-0.5 flex-shrink-0">
                      {isSelected ? (
                        <CheckCircle2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      ) : (
                        <Circle className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>

                    {/* Option content */}
                    <div className="flex-1 min-w-0">
                      <div
                        className={`text-sm font-medium ${isSelected ? "text-blue-700 dark:text-blue-300" : "text-foreground"}`}
                      >
                        {option.label}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {option.description}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Show freeform answer if it doesn't match any option */}
            {selectedAnswer &&
              !question.options.some((opt) => opt.label === selectedAnswer) && (
                <div className="mt-2 p-3 rounded-md bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
                  <div className="text-xs font-semibold text-amber-700 dark:text-amber-300 mb-1">
                    Custom Answer
                  </div>
                  <div className="text-sm text-amber-900 dark:text-amber-100">
                    {selectedAnswer}
                  </div>
                </div>
              )}
          </div>
        );
      })}

      {/* Show answer result if no parsed answers but result exists */}
      {result && Object.keys(answers).length === 0 && (
        <div className="mt-4 p-3 rounded-md bg-muted/50 border">
          <div className="text-xs font-semibold text-muted-foreground mb-2">
            Raw Response
          </div>
          <pre className="text-xs whitespace-pre-wrap">
            {typeof result.content === "string"
              ? result.content
              : JSON.stringify(result.content, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
