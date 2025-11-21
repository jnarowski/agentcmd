import { Plus } from "lucide-react";
import { useFieldArray, useFormContext } from "react-hook-form";
import { Button } from "@/client/components/ui/button";
import type { WebhookFormData } from "../../schemas/webhook.schemas";
import { ConditionRow } from "./ConditionRow";

interface ConditionEditorProps {
  basePath: string;
  testPayload?: Record<string, unknown> | null;
  disabled?: boolean;
}

export function ConditionEditor({
  basePath,
  testPayload,
  disabled = false,
}: ConditionEditorProps) {
  const { control } = useFormContext<WebhookFormData>();
  const { fields, append, remove } = useFieldArray({
    control,
    // @ts-expect-error - Dynamic basePath validated at runtime
    name: basePath,
  });

  const handleAdd = () => {
    append({
      path: "",
      operator: "equals",
      value: "",
    });
  };

  return (
    <div className="space-y-3">
      {fields.length === 0 ? (
        <div className="text-center py-4 text-sm text-muted-foreground border rounded-lg">
          <p className="mb-3">No conditions. All events will match.</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAdd}
            disabled={disabled}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Condition
          </Button>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {fields.map((field, index) => (
              <ConditionRow
                key={field.id}
                basePath={basePath}
                index={index}
                testPayload={testPayload}
                disabled={disabled}
                label={index === 0 ? "if" : "and"}
                showRemove={index > 0}
                onRemove={() => remove(index)}
              />
            ))}
          </div>

          <div className="flex gap-2 items-start">
            {/* Empty space to align with label */}
            <div className="min-w-[2rem]" />

            {/* Button aligned with fields */}
            <div className="flex-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAdd}
                disabled={disabled}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Condition
              </Button>
            </div>

            {/* Empty space to align with remove button */}
            <div className="w-10" />
          </div>
        </>
      )}
    </div>
  );
}
