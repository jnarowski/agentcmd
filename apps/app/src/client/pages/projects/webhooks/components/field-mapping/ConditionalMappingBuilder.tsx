import { Plus, X } from "lucide-react";
import { Controller, useFieldArray, useFormContext } from "react-hook-form";
import { Button } from "@/client/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/client/components/ui/field";
import type { WebhookFormData } from "../../schemas/webhook.schemas";
import { TokenInput } from "../TokenInput";
import { ConditionEditor } from "../conditions/ConditionEditor";

interface ConditionalMappingBuilderProps {
  index: number;
  testPayload?: Record<string, unknown> | null;
  disabled?: boolean;
}

export function ConditionalMappingBuilder({
  index,
  testPayload,
  disabled = false,
}: ConditionalMappingBuilderProps) {
  const {
    control,
    formState: { errors },
  } = useFormContext<WebhookFormData>();

  const { fields, append, remove } = useFieldArray({
    control,
    name: `config.field_mappings.${index}.conditional_values`,
  });

  const handleAdd = () => {
    append({
      conditions: [],
      value: "",
    });
  };

  const conditionalError =
    errors.config?.field_mappings?.[index]?.conditional_values;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <FieldLabel>Conditional Values</FieldLabel>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAdd}
          disabled={disabled}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Condition Group
        </Button>
      </div>

      {fields.length === 0 ? (
        <div className="text-center py-4 text-sm text-muted-foreground border rounded-lg">
          No condition groups. Click "Add Condition Group" to start.
        </div>
      ) : (
        <div className="space-y-4">
          {fields.map((field, groupIndex) => {
            const groupError = Array.isArray(conditionalError)
              ? conditionalError[groupIndex]
              : undefined;

            return (
              <div
                key={field.id}
                className="border rounded-lg p-4 space-y-3 bg-muted/30"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    Condition Group {groupIndex + 1}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => remove(groupIndex)}
                    disabled={disabled}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {/* Conditions */}
                <div>
                  <FieldLabel className="text-xs">When (all must pass)</FieldLabel>
                  <div className="mt-2">
                    <ConditionEditor
                      basePath={`config.field_mappings.${index}.conditional_values.${groupIndex}.conditions`}
                      testPayload={testPayload}
                      disabled={disabled}
                    />
                  </div>
                  {groupError?.conditions && (
                    <FieldError>
                      {groupError.conditions.message as string}
                    </FieldError>
                  )}
                </div>

                {/* Value */}
                <Field>
                  <FieldLabel className="text-xs">Then use value</FieldLabel>
                  <Controller
                    control={control}
                    name={`config.field_mappings.${index}.conditional_values.${groupIndex}.value`}
                    render={({ field }) => (
                      <TokenInput
                        value={field.value || ""}
                        onChange={field.onChange}
                        testPayload={testPayload}
                        placeholder="Enter value or / to pick token"
                        disabled={disabled}
                      />
                    )}
                  />
                  {groupError?.value && (
                    <FieldError>{groupError.value.message}</FieldError>
                  )}
                </Field>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
