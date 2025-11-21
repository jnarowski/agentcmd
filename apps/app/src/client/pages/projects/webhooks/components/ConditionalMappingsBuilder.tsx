import { useFieldArray, useFormContext, Controller } from "react-hook-form";
import { Plus, X } from "lucide-react";
import { Button } from "@/client/components/ui/button";
import { FieldLabel } from "@/client/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/client/components/ui/select";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/client/components/ui/tooltip";
import { ConditionEditor } from "./conditions/ConditionEditor";
import { SpecTypeSelect } from "@/client/pages/projects/workflows/components/SpecTypeSelect";
import { WorkflowDefinitionSelect } from "./WorkflowDefinitionSelect";
import { cn } from "@/client/utils/cn";
import type { WebhookFormData } from "../schemas/webhook.schemas";

interface ConditionalMappingsBuilderProps {
  projectId: string;
  testPayload?: Record<string, unknown> | null;
}

export function ConditionalMappingsBuilder({
  projectId,
  testPayload,
}: ConditionalMappingsBuilderProps) {
  const { control, watch, setValue } = useFormContext<WebhookFormData>();
  const { fields, append, remove } = useFieldArray({
    control,
    name: "config.mappings",
  });

  const defaultAction = watch("config.default_action");

  const handleAddRule = () => {
    append({
      spec_type_id: "",
      workflow_definition_id: "",
      conditions: [
        {
          path: "",
          operator: "equals",
          value: "",
        },
      ],
    });
  };

  return (
    <div>
      {/* Conditional Mapping Groups */}
      {fields.map((field, index) => (
        <div key={field.id}>
          <div className="space-y-4 p-4 border rounded-lg">
            {/* Conditions Section */}
            <div className="space-y-2">
              <ConditionEditor
                basePath={`config.mappings.${index}.conditions`}
                testPayload={testPayload}
                disabled={false}
              />
            </div>

            {/* Then Set Section */}
            <div className="space-y-2">
              <div className="text-sm mb-4 mt-6 font-semibold text-muted-foreground">
                THEN
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <FieldLabel>Spec Type</FieldLabel>
                  <Controller
                    control={control}
                    name={`config.mappings.${index}.spec_type_id`}
                    render={({ field }) => (
                      <SpecTypeSelect
                        projectId={projectId}
                        value={field.value}
                        onValueChange={field.onChange}
                      />
                    )}
                  />
                </div>
                <div className="space-y-2">
                  <FieldLabel>Workflow</FieldLabel>
                  <Controller
                    control={control}
                    name={`config.mappings.${index}.workflow_definition_id`}
                    render={({ field }) => (
                      <WorkflowDefinitionSelect
                        projectId={projectId}
                        value={field.value}
                        onValueChange={field.onChange}
                      />
                    )}
                  />
                </div>
              </div>
            </div>

            {/* Remove Rule Button */}
            <Tooltip open={index === 0 ? undefined : false}>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => remove(index)}
                  disabled={index === 0}
                  className={cn(
                    index !== 0 && "text-destructive hover:text-destructive"
                  )}
                >
                  <X className="h-4 w-4 mr-2" />
                  Remove this rule
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>First rule cannot be removed</p>
              </TooltipContent>
            </Tooltip>
          </div>

          {/* Separator between groups */}
          {index < fields.length - 1 && (
            <div className="text-center py-6 text-sm font-medium text-muted-foreground uppercase tracking-wide">
              If that doesn't match, then
            </div>
          )}
        </div>
      ))}

      {/* Add Another Rule Button */}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleAddRule}
        className="w-full mt-4"
      >
        <Plus className="h-4 w-4 mr-2" />
        Add another rule
      </Button>

      {/* Separator before default section */}
      {fields.length > 0 && (
        <div className="text-center py-6 text-sm font-medium text-muted-foreground uppercase tracking-wide border-t">
          If nothing matches, then
        </div>
      )}

      {/* Default Action Section */}
      <div className="space-y-4 p-4 border rounded-lg">
        <div>
          <Controller
            control={control}
            name="config.default_action"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select action..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="skip">
                    Skip - Don't create workflow run
                  </SelectItem>
                  <SelectItem value="set_fields">
                    Set fields - Create run with default values
                  </SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </div>

        {/* Default Mapping - Only show if set_fields */}
        {defaultAction === "set_fields" && (
          <div className="space-y-4 pt-4 border-t">
            <div className="text-sm font-medium text-muted-foreground">
              Default field values:
            </div>
            <div className="space-y-3">
              <div className="space-y-2">
                <FieldLabel>Spec Type</FieldLabel>
                <Controller
                  control={control}
                  name="config.default_mapping.spec_type_id"
                  render={({ field }) => (
                    <SpecTypeSelect
                      projectId={projectId}
                      value={field.value}
                      onValueChange={(value) => {
                        // Ensure default_mapping object exists
                        const currentMapping = watch(
                          "config.default_mapping"
                        );
                        setValue("config.default_mapping", {
                          ...currentMapping,
                          spec_type_id: value,
                          workflow_definition_id:
                            currentMapping?.workflow_definition_id || "",
                        });
                      }}
                    />
                  )}
                />
              </div>
              <div className="space-y-2">
                <FieldLabel>Workflow</FieldLabel>
                <Controller
                  control={control}
                  name="config.default_mapping.workflow_definition_id"
                  render={({ field }) => (
                    <WorkflowDefinitionSelect
                      projectId={projectId}
                      value={field.value}
                      onValueChange={(value) => {
                        // Ensure default_mapping object exists
                        const currentMapping = watch(
                          "config.default_mapping"
                        );
                        setValue("config.default_mapping", {
                          ...currentMapping,
                          spec_type_id: currentMapping?.spec_type_id || "",
                          workflow_definition_id: value,
                        });
                      }}
                    />
                  )}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
