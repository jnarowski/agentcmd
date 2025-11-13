import { useQuery } from "@tanstack/react-query";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/client/components/ui/select";
import { api } from "@/client/utils/api";

export interface SpecTypeMetadata {
  id: string;
  command: string;
  name: string;
  description: string;
  filePath: string;
}

interface SpecTypeSelectProps {
  projectId: string;
  value?: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
}

export function SpecTypeSelect({
  projectId,
  value,
  onValueChange,
  disabled,
}: SpecTypeSelectProps) {
  const { data, isLoading } = useQuery({
    queryKey: ["specTypes", projectId],
    queryFn: async () => {
      const response = await api.get<{ data: SpecTypeMetadata[] }>(
        `/api/projects/${projectId}/spec-types`
      );
      return response.data;
    },
    enabled: !!projectId,
  });

  if (isLoading) {
    return (
      <Select disabled>
        <SelectTrigger>
          <SelectValue placeholder="Loading spec types..." />
        </SelectTrigger>
      </Select>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Select disabled>
        <SelectTrigger>
          <SelectValue placeholder="No spec types found" />
        </SelectTrigger>
      </Select>
    );
  }

  // Get selected type for display
  const selectedType = data.find((t) => t.id === value);

  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger>
        <SelectValue placeholder="Select spec type">
          {selectedType && (
            <span className="flex items-center gap-2">
              <span className="font-medium">{selectedType.name}</span>
              <span className="text-xs text-muted-foreground">·</span>
              <span className="text-xs text-muted-foreground">
                {selectedType.command}
              </span>
            </span>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="w-[--radix-select-trigger-width]" align="start" position="popper" sideOffset={4}>
        {data.map((type: SpecTypeMetadata) => {
          // Extract first sentence from description
          const firstSentence = type.description.split(/[.!?]/)[0].trim();

          return (
            <SelectItem key={type.id} value={type.id} className="!pr-2 w-full">
              <div className="flex flex-col gap-1 py-1 w-full pr-6">
                <div className="flex items-center justify-between gap-2 w-full">
                  <div className="font-medium">{type.name}</div>
                  <div className="text-xs text-muted-foreground font-mono shrink-0">
                    {type.command}
                  </div>
                </div>
                {firstSentence && (
                  <div className="text-xs text-muted-foreground">
                    {firstSentence}
                  </div>
                )}
              </div>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
