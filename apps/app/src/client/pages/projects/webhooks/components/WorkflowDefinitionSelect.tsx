import { useQuery } from "@tanstack/react-query";
import { Combobox } from "@/client/components/ui/combobox";
import { api } from "@/client/utils/api";
import { cn } from "@/client/utils/cn";

export interface WorkflowDefinition {
  id: string;
  identifier: string;
  name: string;
  description: string | null;
}

interface WorkflowDefinitionSelectProps {
  projectId: string;
  value?: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
}

export function WorkflowDefinitionSelect({
  projectId,
  value,
  onValueChange,
  disabled,
}: WorkflowDefinitionSelectProps) {
  const { data, isLoading } = useQuery({
    queryKey: ["workflows", projectId],
    queryFn: async () => {
      const response = await api.get<{ data: WorkflowDefinition[] }>(
        `/api/projects/${projectId}/workflows`
      );
      return response.data;
    },
    enabled: !!projectId,
  });

  const options = (data || []).map((workflow) => ({
    value: workflow.id,
    label: workflow.name,
    description: workflow.description || undefined,
    badge: workflow.identifier,
  }));

  return (
    <Combobox
      value={value}
      onValueChange={onValueChange}
      options={options}
      placeholder={
        isLoading
          ? "Loading workflows..."
          : !data || data.length === 0
            ? "No workflows found"
            : "Select workflow..."
      }
      searchPlaceholder="Search workflows..."
      emptyMessage="No workflows found"
      disabled={disabled || isLoading || !data || data.length === 0}
      renderTrigger={(selectedOption) =>
        selectedOption ? (
          <div className="flex items-center justify-between gap-2 w-full min-w-0">
            <span className="truncate font-medium">{selectedOption.label}</span>
            <span className="hidden sm:inline text-xs text-muted-foreground/60 shrink-0 font-mono">
              {selectedOption.badge}
            </span>
          </div>
        ) : (
          <span>
            {isLoading
              ? "Loading workflows..."
              : !data || data.length === 0
                ? "No workflows found"
                : "Select workflow..."}
          </span>
        )
      }
      renderOption={(option, selected) => {
        // Extract first sentence from description
        const firstSentence = option.description?.split(/[.!?]/)[0]?.trim();

        return (
          <div className="flex flex-col gap-1 py-1 w-full">
            <div className="flex items-center justify-between gap-2">
              <div className={cn("font-medium", selected && "text-primary")}>
                {option.label}
              </div>
            </div>
            <div className="text-xs text-muted-foreground font-mono shrink-0">
              {option.badge}
            </div>
            {firstSentence && (
              <div className="text-xs text-muted-foreground/60">
                {firstSentence}
              </div>
            )}
          </div>
        );
      }}
    />
  );
}
