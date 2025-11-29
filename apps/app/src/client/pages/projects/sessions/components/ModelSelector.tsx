import {
  PromptInputModelSelect,
  PromptInputModelSelectContent,
  PromptInputModelSelectItem,
  PromptInputModelSelectTrigger,
  PromptInputModelSelectValue,
} from "@/client/components/ai-elements/PromptInput";

export interface ModelSelectorProps {
  currentModel: string;
  models: Array<{ id: string; name: string }>;
  onModelChange: (modelId: string) => void;
}

/**
 * Model selector component for ChatPromptInput.
 *
 * Displays a dropdown to select between available AI models
 * for agents that support model selection (e.g., Claude Code with different Claude versions).
 *
 * Only renders if models array is not empty.
 * Hidden on mobile devices (md:flex).
 *
 * @param props.currentModel - Currently selected model ID
 * @param props.models - Available models with id and name
 * @param props.onModelChange - Callback when model changes
 */
export function ModelSelector({
  currentModel,
  models,
  onModelChange,
}: ModelSelectorProps) {
  // Don't render if no models available
  if (models.length === 0) {
    return null;
  }

  return (
    <div className="hidden md:flex">
      <PromptInputModelSelect
        value={currentModel}
        onValueChange={onModelChange}
      >
        <PromptInputModelSelectTrigger>
          <PromptInputModelSelectValue />
        </PromptInputModelSelectTrigger>
        <PromptInputModelSelectContent>
          {models.map((m) => (
            <PromptInputModelSelectItem key={m.id} value={m.id}>
              {m.name}
            </PromptInputModelSelectItem>
          ))}
        </PromptInputModelSelectContent>
      </PromptInputModelSelect>
    </div>
  );
}
