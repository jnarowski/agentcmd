/**
 * Router for tool block renderers
 * Dispatches to appropriate Block component based on tool name
 * Falls back to DefaultToolBlock for unknown tools
 */

import { ReadToolBlock } from './blocks/ReadToolBlock';
import { WriteToolBlock } from './blocks/WriteToolBlock';
import { EditToolBlock } from './blocks/EditToolBlock';
import { BashToolBlock } from './blocks/BashToolBlock';
import { TodoWriteToolBlock } from './blocks/TodoWriteToolBlock';
import { WebSearchToolBlock } from './blocks/WebSearchToolBlock';
import { GlobToolBlock } from './blocks/GlobToolBlock';
import { GrepToolBlock } from './blocks/GrepToolBlock';
import { TaskToolBlock } from './blocks/TaskToolBlock';
import { AskUserQuestionToolBlock } from './blocks/AskUserQuestionToolBlock';
import { DefaultToolBlock } from './blocks/DefaultToolBlock';

import type {
  ReadToolInput,
  WriteToolInput,
  EditToolInput,
  BashToolInput,
  TodoWriteToolInput,
  WebSearchToolInput,
  GlobToolInput,
  GrepToolInput,
  TaskToolInput,
  AskUserQuestionToolInput,
} from '@/shared/types/tool.types';
import type { UnifiedImageBlock } from 'agent-cli-sdk';

interface ToolBlockRendererProps {
  toolName: string;
  toolUseId: string;
  input: Record<string, unknown>;
  result?: {
    content: string | UnifiedImageBlock;
    is_error?: boolean;
  };
  onApprove?: (toolUseId: string) => void;
}

export function ToolBlockRenderer({ toolName, toolUseId, input, result, onApprove }: ToolBlockRendererProps) {
  switch (toolName) {
    case 'Read':
      return <ReadToolBlock input={input as unknown as ReadToolInput} result={result} />;

    case 'Write':
      return <WriteToolBlock input={input as unknown as WriteToolInput} result={result} toolUseId={toolUseId} onApprove={onApprove} />;

    case 'Edit':
      return <EditToolBlock input={input as unknown as EditToolInput} result={result} toolUseId={toolUseId} onApprove={onApprove} />;

    case 'Bash':
      return <BashToolBlock input={input as unknown as BashToolInput} result={result} toolUseId={toolUseId} onApprove={onApprove} />;

    case 'TodoWrite':
      return <TodoWriteToolBlock input={input as unknown as TodoWriteToolInput} result={result} />;

    case 'WebSearch':
      return <WebSearchToolBlock toolUseId={toolUseId} input={input as unknown as WebSearchToolInput} result={result} onApprove={onApprove} />;

    case 'Glob':
      return <GlobToolBlock input={input as unknown as GlobToolInput} result={result} />;

    case 'Grep':
      return <GrepToolBlock input={input as unknown as GrepToolInput} result={result} />;

    case 'Task':
      return <TaskToolBlock input={input as unknown as TaskToolInput} result={result} />;

    case 'AskUserQuestion':
      return <AskUserQuestionToolBlock input={input as unknown as AskUserQuestionToolInput} result={result} />;

    default:
      // Fallback to default block for unknown tools
      return <DefaultToolBlock toolName={toolName} toolUseId={toolUseId} input={input} result={result} onApprove={onApprove} />;
  }
}
