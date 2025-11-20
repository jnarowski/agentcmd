import { Controller, useFormContext, useWatch } from "react-hook-form";
import { Field, FieldError, FieldLabel } from "@/client/components/ui/field";
import { Input } from "@/client/components/ui/input";
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
    formState: { errors },
  } = useFormContext<WebhookFormData>();

  const mappingType = useWatch({
    control,
    name: `config.field_mappings.${index}.type`,
  });

  const fieldError = errors.config?.field_mappings?.[index];

  return (
    <div className="space-y-3 px-3 py-4 sm:p-4 border rounded-lg">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Field Name */}
        <Field>
          <FieldLabel>Field Name</FieldLabel>
          <Controller
            control={control}
            name={`config.field_mappings.${index}.field`}
            render={({ field }) => (
              <Combobox
                value={field.value}
                onValueChange={field.onChange}
                options={FIELD_NAME_OPTIONS}
                placeholder="Select field"
                disabled={disabled}
              />
            )}
          />
          {fieldError?.field && (
            <FieldError>{fieldError.field.message}</FieldError>
          )}
        </Field>

        {/* Mapping Type */}
        <Field>
          <FieldLabel>Type</FieldLabel>
          <Controller
            control={control}
            name={`config.field_mappings.${index}.type`}
            render={({ field }) => (
              <Combobox
                value={field.value}
                onValueChange={field.onChange}
                options={MAPPING_TYPE_OPTIONS}
                placeholder="Select type"
                disabled={disabled}
              />
            )}
          />
          {fieldError?.type && (
            <FieldError>{fieldError.type.message}</FieldError>
          )}
        </Field>
      </div>

      {/* Value Input for Direct Mapping */}
      {mappingType === "input" && (
        <Field>
          <FieldLabel>Value</FieldLabel>
          <Controller
            control={control}
            name={`config.field_mappings.${index}.value`}
            render={({ field }) => (
              <TokenInput
                value={field.value as string}
                onChange={field.onChange}
                testPayload={testPayload}
                placeholder="Enter value or / to pick token"
                disabled={disabled}
              />
            )}
          />
          {fieldError?.value && (
            <FieldError>{fieldError.value.message as string}</FieldError>
          )}
        </Field>
      )}

      {/* Conditional Mapping Builder */}
      {mappingType === "conditional" && (
        <ConditionalMappingBuilder
          index={index}
          testPayload={testPayload}
          disabled={disabled}
        />
      )}
    </div>
  );
}
