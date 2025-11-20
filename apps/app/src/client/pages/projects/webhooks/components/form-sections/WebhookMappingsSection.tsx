import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/client/components/ui/alert";
import { FieldDescription, FieldLabel } from "@/client/components/ui/field";
import { FieldMappingEditor } from "../field-mapping/FieldMappingEditor";

interface WebhookMappingsSectionProps {
  testPayload?: Record<string, unknown> | null;
  locked?: boolean;
}

export function WebhookMappingsSection({
  testPayload,
  locked = false,
}: WebhookMappingsSectionProps) {
  if (locked) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Send a test webhook event to unlock field mapping configuration
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <FieldLabel>Field Mappings</FieldLabel>
        <FieldDescription>
          Map webhook payload fields to workflow input parameters. Use the
          token picker to select fields from your test payload.
        </FieldDescription>
      </div>
      <FieldMappingEditor testPayload={testPayload} disabled={false} />
    </div>
  );
}
