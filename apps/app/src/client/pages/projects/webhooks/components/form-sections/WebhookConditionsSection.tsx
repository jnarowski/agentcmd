import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/client/components/ui/alert";
import { FieldDescription, FieldLabel } from "@/client/components/ui/field";
import { ConditionEditor } from "../conditions/ConditionEditor";

interface WebhookConditionsSectionProps {
  testPayload?: Record<string, unknown> | null;
  locked?: boolean;
}

export function WebhookConditionsSection({
  testPayload,
  locked = false,
}: WebhookConditionsSectionProps) {
  if (locked) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Send a test webhook event to unlock webhook conditions configuration
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <FieldLabel>Webhook Conditions</FieldLabel>
        <FieldDescription>
          Filter which webhook events should trigger workflow runs. Only events
          matching all conditions will be processed.
        </FieldDescription>
      </div>
      <ConditionEditor
        basePath="webhook_conditions"
        testPayload={testPayload}
        disabled={false}
      />
    </div>
  );
}
