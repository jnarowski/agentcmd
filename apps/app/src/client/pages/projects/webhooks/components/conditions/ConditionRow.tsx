import { Controller, useFormContext, useWatch } from "react-hook-form";
import { Field, FieldError } from "@/client/components/ui/field";
import { Combobox } from "@/client/components/ui/combobox";
import type { WebhookFormData } from "../../schemas/webhook.schemas";
import { TokenInput } from "../TokenInput";

interface ConditionRowProps {
  basePath: string;
  index: number;
  testPayload?: Record<string, unknown> | null;
  disabled?: boolean;
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

export function ConditionRow({
  basePath,
  index,
  testPayload,
  disabled = false,
}: ConditionRowProps) {
  const {
    control,
    formState: { errors },
  } = useFormContext<WebhookFormData>();

  const operator = useWatch({
    control,
    // @ts-expect-error - Dynamic path validated at runtime
    name: `${basePath}.${index}.operator`,
  });

  const showValue = !VALUE_HIDDEN_OPERATORS.includes(operator as string);

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
    <div className="flex flex-col gap-2 sm:grid sm:grid-cols-12 sm:items-start">
      {/* Path */}
      <div className="sm:col-span-5">
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
      <div className={showValue ? "sm:col-span-3" : "sm:col-span-7"}>
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
  );
}
