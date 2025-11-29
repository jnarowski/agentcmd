import { useMemo } from "react";
import { Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Combobox } from "@/client/components/ui/combobox";
import { Button } from "@/client/components/ui/button";
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
  const navigate = useNavigate();
  const { data: specFiles } = useProjectSpecs(projectId, {
    status: ["draft", "in-progress", "review"],
    enabled: true,
  });

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

  // Get selected spec info for viewer
  const selectedSpec = useMemo(() => {
    if (!value || !specFiles) return null;
    return specFiles.find((spec) => spec.specPath === value);
  }, [value, specFiles]);

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
      <div className="flex items-stretch gap-2">
        <div className="flex-1 min-w-0">
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
                      {selectedOption.description.replace(
                        ".agent/specs/todo/",
                        ""
                      )}
                    </span>
                  )}
                </div>
              ) : (
                <span>Select spec file...</span>
              )
            }
            renderOption={(option, selected) => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const specType = (option as any).specType;
              return (
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn("font-medium", selected && "text-primary")}
                    >
                      {option.label}
                    </span>
                    {specType && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                        {specType}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {option.description}
                  </div>
                </div>
              );
            }}
          />
        </div>
        <Button
          variant="outline"
          onClick={() => {
            if (selectedSpec) {
              navigate(`/projects/${projectId}/specs/${selectedSpec.id}`);
            }
          }}
          disabled={!value || disabled}
          title="View and edit spec file"
          className="h-full"
        >
          <Eye className="h-4 w-4" />
          <span className="hidden sm:inline ml-1.5">View Spec</span>
        </Button>
      </div>
    </div>
  );
}
