/**
 * AskUserQuestion tool block component
 */

import { ToolCollapsibleWrapper } from "@/client/pages/projects/sessions/components/session/claude/ToolCollapsibleWrapper";
import { AskUserQuestionToolRenderer } from "@/client/pages/projects/sessions/components/session/claude/tools/AskUserQuestionToolRenderer";
import type { AskUserQuestionToolInput } from "@/shared/types/tool.types";
import type { UnifiedImageBlock } from 'agent-cli-sdk';

interface AskUserQuestionToolBlockProps {
  input: AskUserQuestionToolInput;
  result?: {
    content: string | UnifiedImageBlock;
    is_error?: boolean;
  };
}

export function AskUserQuestionToolBlock({ input, result }: AskUserQuestionToolBlockProps) {
  // Create description from questions
  const questionCount = input.questions.length;
  const description = `${questionCount} question${questionCount > 1 ? 's' : ''}`;

  return (
    <ToolCollapsibleWrapper
      toolName="Ask User Question"
      contextInfo={null}
      description={description}
      hasError={result?.is_error}
      defaultOpen={false}
    >
      <AskUserQuestionToolRenderer input={input} result={result} />
    </ToolCollapsibleWrapper>
  );
}
