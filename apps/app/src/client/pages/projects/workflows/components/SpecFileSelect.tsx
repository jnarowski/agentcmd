import { useMemo } from "react";
import { Combobox } from "@/client/components/ui/combobox";
import { useProjectSpecs } from "@/client/pages/projects/hooks/useProjectSpecs";
import { cn } from "@/client/utils/cn";

interface SpecFileSelectProps {
  projectId: string;
  value: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
  onSpecTypeChange?: (specType: string) => void;
}

export function SpecFileSelect({
  projectId,
  value,
  onValueChange,
  disabled,
  onSpecTypeChange,
}: SpecFileSelectProps) {
  const { data: specFiles } = useProjectSpecs(projectId, true);

  // Transform spec tasks to combobox options with spec type
  const specFileOptions = useMemo(() => {
    if (!specFiles) return [];
    return specFiles.map((task) => ({
      value: task.specPath,
      label: task.name,
      description: task.specPath,
      specType: task.spec_type,
    }));
  }, [specFiles]);

  const handleValueChange = (newValue: string) => {
    onValueChange(newValue);

    // Auto-populate spec type when spec file is selected
    if (onSpecTypeChange) {
      const selectedSpec = specFiles?.find(
        (task) => task.specPath === newValue
      );
      if (selectedSpec) {
        onSpecTypeChange(selectedSpec.spec_type);
      }
    }
  };

  return (
    <div className="space-y-2">
      <Combobox
        value={value}
        onValueChange={handleValueChange}
        options={specFileOptions}
        placeholder="Select spec file..."
        searchPlaceholder="Search spec files..."
        emptyMessage="No spec files found"
        disabled={disabled}
        renderTrigger={(selectedOption) =>
          selectedOption ? (
            <div className="flex items-center gap-2 w-full min-w-0">
              <span className="truncate font-medium">
                {selectedOption.label}
              </span>
              {selectedOption.description && (
                <span className="hidden sm:inline text-xs text-muted-foreground/60 truncate shrink-0">
                  {selectedOption.description.replace(".agent/specs/todo/", "")}
                </span>
              )}
            </div>
          ) : (
            <span>Select spec file...</span>
          )
        }
        renderOption={(option, selected) => (
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <span className={cn("font-medium", selected && "text-primary")}>
                {option.label}
              </span>
              {option.specType && (
                <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                  {option.specType}
                </span>
              )}
            </div>
            <div className="text-xs text-muted-foreground">
              {option.description}
            </div>
          </div>
        )}
      />
      <p className="text-xs text-muted-foreground">
        Use /cmd:generate-[type]-spec to generate spec files for this dropdown
      </p>
    </div>
  );
}
