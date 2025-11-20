import { Plus, X } from "lucide-react";
import { useFieldArray, useFormContext } from "react-hook-form";
import { Button } from "@/client/components/ui/button";
import type { WebhookFormData } from "../../schemas/webhook.schemas";
import { FieldMappingRow } from "./FieldMappingRow";

interface FieldMappingEditorProps {
  testPayload?: Record<string, unknown> | null;
  disabled?: boolean;
}

export function FieldMappingEditor({
  testPayload,
  disabled = false,
}: FieldMappingEditorProps) {
  const { control } = useFormContext<WebhookFormData>();
  const { fields, append, remove } = useFieldArray({
    control,
    name: "config.field_mappings",
  });

  const handleAdd = () => {
    append({
      field: "",
      type: "input",
      value: "",
    });
  };

  return (
    <div className="space-y-4">
      {fields.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <p className="mb-4">No field mappings configured</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAdd}
            disabled={disabled}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Field Mapping
          </Button>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {fields.map((field, index) => (
              <div key={field.id} className="flex gap-2 items-start">
                <div className="flex-1">
                  <FieldMappingRow
                    index={index}
                    testPayload={testPayload}
                    disabled={disabled}
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => remove(index)}
                  disabled={disabled}
                  className="mt-1"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAdd}
            disabled={disabled}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Field Mapping
          </Button>
        </>
      )}
    </div>
  );
}
