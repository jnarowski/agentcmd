import { Controller, useFormContext, useWatch } from "react-hook-form";
import { FieldError } from "@/client/components/ui/field";
import { Combobox } from "@/client/components/ui/combobox";
import type { WebhookFormData } from "../../schemas/webhook.schemas";
import { TokenInput } from "../TokenInput";
import { ConditionalMappingBuilder } from "./ConditionalMappingBuilder";

interface FieldMappingRowProps {
  index: number;
  testPayload?: Record<string, unknown> | null;
  disabled?: boolean;
}

const MAPPING_TYPE_OPTIONS = [
  { label: "Direct Value", value: "input" },
  { label: "Conditional", value: "conditional" },
];

const FIELD_NAME_OPTIONS = [
  { label: "Workflow", value: "workflow" },
  { label: "Spec Type", value: "spec_type" },
  { label: "Spec Content", value: "spec_content" },
];

export function FieldMappingRow({
  index,
  testPayload,
  disabled = false,
}: FieldMappingRowProps) {
  const {
    control,
    setValue,
    formState: { errors },
  } = useFormContext<WebhookFormData>();

  const mappingType = useWatch({
    control,
    name: `config.field_mappings.${index}.type`,
  });

  const fieldError = errors.config?.field_mappings?.[index];

  return (
    <div className="space-y-3 px-3 py-4 sm:p-4 border rounded-lg">
      {/* Sentence-style input group */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold text-foreground">Set</span>

        {/* Field Name Dropdown */}
        <Controller
          control={control}
          name={`config.field_mappings.${index}.field`}
          render={({ field }) => (
            <div className="min-w-[180px]">
              <Combobox
                value={field.value}
                onValueChange={field.onChange}
                options={FIELD_NAME_OPTIONS}
                placeholder="Select field"
                disabled={disabled}
              />
            </div>
          )}
        />

        <span className="text-sm font-semibold text-foreground">to</span>

        {/* Value Input */}
        {mappingType === "input" && (
          <Controller
            control={control}
            name={`config.field_mappings.${index}.value`}
            render={({ field }) => (
              <div className="flex-1 min-w-[200px]">
                <TokenInput
                  value={field.value as string}
                  onChange={field.onChange}
                  testPayload={testPayload}
                  placeholder="Enter value or / to pick token"
                  disabled={disabled}
                />
              </div>
            )}
          />
        )}
      </div>

      {/* Errors */}
      {fieldError?.field && (
        <FieldError>{fieldError.field.message}</FieldError>
      )}
      {fieldError?.value && (
        <FieldError>{fieldError.value.message as string}</FieldError>
      )}

      {/* Toggle to conditional */}
      {mappingType === "input" && (
        <button
          type="button"
          onClick={() => {
            setValue(`config.field_mappings.${index}.type`, "conditional", {
              shouldDirty: true,
            });
          }}
          disabled={disabled}
          className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-4 transition-colors"
        >
          Make this dependent on a condition
        </button>
      )}

      {/* Conditional Mapping Builder */}
      {mappingType === "conditional" && (
        <div className="space-y-3">
          <ConditionalMappingBuilder
            index={index}
            testPayload={testPayload}
            disabled={disabled}
          />
          <button
            type="button"
            onClick={() => {
              setValue(`config.field_mappings.${index}.type`, "input", {
                shouldDirty: true,
              });
            }}
            disabled={disabled}
            className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-4 transition-colors"
          >
            Switch to direct value
          </button>
        </div>
      )}
    </div>
  );
}
