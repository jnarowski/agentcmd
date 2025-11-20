import { useEffect } from "react";
import { Controller, useFormContext, useWatch } from "react-hook-form";
import { X } from "lucide-react";
import { Field, FieldError } from "@/client/components/ui/field";
import { Combobox } from "@/client/components/ui/combobox";
import { Button } from "@/client/components/ui/button";
import type { WebhookFormData } from "../../schemas/webhook.schemas";
import { TokenInput } from "../TokenInput";

interface ConditionRowProps {
  basePath: string;
  index: number;
  testPayload?: Record<string, unknown> | null;
  disabled?: boolean;
  label: "if" | "and";
  showRemove: boolean;
  onRemove: () => void;
}

const OPERATOR_OPTIONS = [
  { label: "Equals", value: "equals" },
  { label: "Not Equals", value: "not_equals" },
  { label: "Contains", value: "contains" },
  { label: "Not Contains", value: "not_contains" },
  { label: "Exists", value: "exists" },
  { label: "Not Exists", value: "not_exists" },
  { label: "Greater Than", value: "greater_than" },
  { label: "Less Than", value: "less_than" },
  { label: "Matches Regex", value: "matches_regex" },
];

const VALUE_HIDDEN_OPERATORS = ["exists", "not_exists"];

/**
 * Get value from object using dot notation path
 */
function getValueFromPath(obj: Record<string, unknown>, path: string): unknown {
  // Extract path from {{path}} if present
  const cleanPath = path.replace(/^\{\{|\}\}$/g, "");

  const parts = cleanPath.split(".");
  let value: unknown = obj;

  for (const part of parts) {
    if (value && typeof value === "object" && part in value) {
      value = (value as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }

  return value;
}

export function ConditionRow({
  basePath,
  index,
  testPayload,
  disabled = false,
  label,
  showRemove,
  onRemove,
}: ConditionRowProps) {
  const {
    control,
    formState: { errors },
    setValue,
  } = useFormContext<WebhookFormData>();

  const path = useWatch({
    control,
    // @ts-expect-error - Dynamic path validated at runtime
    name: `${basePath}.${index}.path`,
  });

  const operator = useWatch({
    control,
    // @ts-expect-error - Dynamic path validated at runtime
    name: `${basePath}.${index}.operator`,
  });

  const showValue = !VALUE_HIDDEN_OPERATORS.includes(operator as string);

  // Auto-populate value when path changes
  useEffect(() => {
    if (!testPayload || !path || !showValue) return;

    const value = getValueFromPath(testPayload, path);
    if (value !== undefined) {
      // Convert value to string for display
      const stringValue =
        typeof value === "string" ? value : JSON.stringify(value);
      // @ts-expect-error - Dynamic path validated at runtime
      setValue(`${basePath}.${index}.value`, stringValue, { shouldDirty: true });
    }
  }, [path, testPayload, basePath, index, setValue, showValue]);

  // Navigate to the error for this condition
  const getError = () => {
    const parts = basePath.split(".");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let error: any = errors;
    for (const part of parts) {
      if (!error) return undefined;
      error = error[part];
    }
    return error?.[index];
  };

  const conditionError = getError();

  return (
    <div className="flex gap-2 items-start">
      {/* Label */}
      <span className="text-sm font-medium text-muted-foreground mt-2 min-w-[2rem]">
        {label}
      </span>

      {/* Condition Fields */}
      <div className="flex-1 flex flex-col gap-2 sm:grid sm:grid-cols-12 sm:items-start">
        {/* Path */}
        <div className="sm:col-span-4">
          <Field>
            <Controller
              control={control}
              // @ts-expect-error - Dynamic path validated at runtime
              name={`${basePath}.${index}.path`}
              render={({ field }) => (
                <TokenInput
                  value={field.value as string}
                  onChange={field.onChange}
                  testPayload={testPayload}
                  placeholder="Field path or / to pick"
                  disabled={disabled}
                />
              )}
            />
            {conditionError?.path && (
              <FieldError>{conditionError.path.message}</FieldError>
            )}
          </Field>
        </div>

        {/* Operator */}
        <div className={showValue ? "sm:col-span-4" : "sm:col-span-8"}>
          <Field>
            <Controller
              control={control}
              // @ts-expect-error - Dynamic path validated at runtime
              name={`${basePath}.${index}.operator`}
              render={({ field }) => (
                <Combobox
                  value={field.value}
                  onValueChange={field.onChange}
                  options={OPERATOR_OPTIONS}
                  placeholder="Operator"
                  disabled={disabled}
                />
              )}
            />
            {conditionError?.operator && (
              <FieldError>{conditionError.operator.message}</FieldError>
            )}
          </Field>
        </div>

        {/* Value (hidden for exists/not_exists) */}
        {showValue && (
          <div className="sm:col-span-4">
            <Field>
              <Controller
                control={control}
                // @ts-expect-error - Dynamic path validated at runtime
                name={`${basePath}.${index}.value`}
                render={({ field }) => (
                  <TokenInput
                    value={field.value as string}
                    onChange={field.onChange}
                    testPayload={testPayload}
                    placeholder="Value or / to pick"
                    disabled={disabled}
                  />
                )}
              />
              {conditionError?.value && (
                <FieldError>{conditionError.value.message}</FieldError>
              )}
            </Field>
          </div>
        )}
      </div>

      {/* Remove Button - always show, disable for first row */}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onRemove}
        disabled={disabled || !showRemove}
        title={showRemove ? "Remove condition" : "First condition cannot be removed"}
        className="mt-1"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
