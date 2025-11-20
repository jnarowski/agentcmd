import { Controller, type Control } from "react-hook-form";
import { AlertCircle, Loader2 } from "lucide-react";
import { Field, FieldContent, FieldLabel, FieldDescription } from "@/client/components/ui/field";
import { Combobox, type ComboboxOption } from "@/client/components/ui/combobox";
import { Alert, AlertDescription } from "@/client/components/ui/alert";
import { useWorkflowsForWebhook } from "../../hooks/useWorkflowsForWebhook";
import type { UpdateWebhookFormValues } from "../../schemas/webhook.schemas";

interface WebhookWorkflowSectionProps {
  control: Control<UpdateWebhookFormValues>;
  projectId: string;
  locked?: boolean;
}

export function WebhookWorkflowSection({
  control,
  projectId,
  locked = false,
}: WebhookWorkflowSectionProps) {
  const { data: workflows, isLoading } = useWorkflowsForWebhook(projectId);

  const workflowOptions: ComboboxOption[] =
    workflows?.map((workflow) => ({
      value: workflow.identifier,
      label: workflow.name,
      description: workflow.description || undefined,
    })) || [];

  if (locked) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Send a test webhook event to unlock workflow configuration
        </AlertDescription>
      </Alert>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (workflowOptions.length === 0) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          No workflows available. Create a workflow first to use with this webhook.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <Controller
        control={control}
        name="workflow_identifier"
        render={({ field, fieldState }) => (
          <Field data-invalid={!!fieldState.error}>
            <FieldLabel>Target Workflow</FieldLabel>
            <FieldContent>
              <Combobox
                value={field.value || ""}
                onValueChange={field.onBlur}
                options={workflowOptions}
                placeholder="Select a workflow..."
                searchPlaceholder="Search workflows..."
                emptyMessage="No workflows found"
              />
              <FieldDescription>
                Select the workflow to run when this webhook receives an event
              </FieldDescription>
              {fieldState.error && (
                <p className="text-sm text-destructive">{fieldState.error.message}</p>
              )}
            </FieldContent>
          </Field>
        )}
      />
    </div>
  );
}
