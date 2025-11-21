import { useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { useFormContext, Controller } from "react-hook-form";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/client/components/ui/alert";
import { FieldLabel } from "@/client/components/ui/field";
import { RadioGroup, RadioGroupItem } from "@/client/components/ui/radio-group";
import { Label } from "@/client/components/ui/label";
import { TestPayloadSelector } from "../TestPayloadSelector";
import { TokenInput } from "../TokenInput";
import { SpecTypeSelect } from "@/client/pages/projects/workflows/components/SpecTypeSelect";
import { WorkflowDefinitionSelect } from "../WorkflowDefinitionSelect";
import { ConditionalMappingsBuilder } from "../ConditionalMappingsBuilder";
import { useProjectId } from "@/client/hooks/useProjectId";
import type { WebhookFormData } from "../../schemas/webhook.schemas";

interface WebhookMappingsSectionProps {
  testPayload?: Record<string, unknown> | null;
  locked?: boolean;
}

export function WebhookMappingsSection({
  testPayload: initialTestPayload,
  locked = false,
}: WebhookMappingsSectionProps) {
  const projectId = useProjectId();
  const { webhookId } = useParams<{ webhookId: string }>();
  const { control, watch, setValue } = useFormContext<WebhookFormData>();

  const [testPayload, setTestPayload] = useState<Record<
    string,
    unknown
  > | null>(initialTestPayload || null);

  // Watch config.mappings to determine mode
  const mappings = watch("config.mappings") || [];
  const defaultAction = watch("config.default_action");

  // Determine current mode (simple = 1 mapping with no conditions and no default_action)
  const isSimpleMode =
    mappings.length === 1 &&
    mappings[0]?.conditions?.length === 0 &&
    !defaultAction;

  const handlePayloadSelect = useCallback(
    (payload: Record<string, unknown> | null) => {
      setTestPayload(payload);
    },
    []
  );

  const handleModeChange = (mode: "simple" | "conditional") => {
    if (mode === "simple") {
      // Switch to simple mode: 1 mapping with empty conditions, no default_action
      setValue("config.mappings", [
        {
          spec_type_id: mappings[0]?.spec_type_id || "",
          workflow_definition_id: mappings[0]?.workflow_definition_id || "",
          conditions: [],
        },
      ]);
      setValue("config.default_action", undefined);
      setValue("config.default_mapping", undefined);
    } else {
      // Switch to conditional mode: add default_action
      setValue("config.default_action", "skip");
      if (mappings.length === 0 || mappings[0]?.conditions?.length === 0) {
        // If switching from simple, convert to conditional with one initial condition
        setValue("config.mappings", [
          {
            spec_type_id: mappings[0]?.spec_type_id || "",
            workflow_definition_id: mappings[0]?.workflow_definition_id || "",
            conditions: [
              {
                path: "",
                operator: "equals",
                value: "",
              },
            ],
          },
        ]);
      }
    }
  };

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
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Workflow Run Mapping</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Configure how webhook payloads map to workflow runs
        </p>
      </div>

      {/* Test Payload Selector - only if webhookId exists */}
      {webhookId && (
        <div className="space-y-2">
          <FieldLabel>Test Payload</FieldLabel>
          <div className="max-w-lg">
            <TestPayloadSelector
              webhookId={webhookId}
              onPayloadSelect={handlePayloadSelect}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Select a recent webhook event to use for testing field mappings
          </p>
        </div>
      )}

      {/* Workflow Run Name */}
      <div className="space-y-2">
        <FieldLabel>Name</FieldLabel>
        <Controller
          control={control}
          name="config.name"
          render={({ field }) => (
            <TokenInput
              value={field.value as string}
              onChange={field.onChange}
              testPayload={testPayload}
              placeholder="e.g., PR: {{pull_request.title}}"
            />
          )}
        />
        <p className="text-xs text-muted-foreground">
          Template for workflow run name. Use {"{{"} tokens {"}"} to insert
          values from the payload.
        </p>
      </div>

      {/* Spec Content */}
      <div className="space-y-2">
        <FieldLabel>Spec Content</FieldLabel>
        <Controller
          control={control}
          name="config.spec_content"
          render={({ field }) => (
            <TokenInput
              value={field.value as string}
              onChange={field.onChange}
              testPayload={testPayload}
              placeholder="Search JSON payload to pick a field"
            />
          )}
        />
        <p className="text-xs text-muted-foreground">
          Template for the spec content. Use {"{{"} tokens {"}"} to insert
          values from the payload.
        </p>
      </div>

      {/* Mapping Mode Selection */}
      <div className="space-y-3">
        <FieldLabel>Mapping Mode</FieldLabel>
        <div className="max-w-md">
          <RadioGroup
            value={isSimpleMode ? "simple" : "conditional"}
            onValueChange={(value) =>
              handleModeChange(value as "simple" | "conditional")
            }
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="simple" id="mode-simple" />
              <Label
                htmlFor="mode-simple"
                className="font-normal cursor-pointer"
              >
                Set fields - Always use the same values
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="conditional" id="mode-conditional" />
              <Label
                htmlFor="mode-conditional"
                className="font-normal cursor-pointer"
              >
                Set fields conditionally - Use different values based on payload
              </Label>
            </div>
          </RadioGroup>
        </div>
      </div>

      {/* Simple Mode - Show Selects */}
      {isSimpleMode && (
        <div className="space-y-4">
          <div className="space-y-2">
            <FieldLabel>Spec Type</FieldLabel>
            <div className="max-w-lg">
              <Controller
                control={control}
                name="config.mappings.0.spec_type_id"
                render={({ field }) => (
                  <SpecTypeSelect
                    projectId={projectId!}
                    value={field.value}
                    onValueChange={field.onChange}
                  />
                )}
              />
            </div>
          </div>
          <div className="space-y-2">
            <FieldLabel>Workflow</FieldLabel>
            <div className="max-w-lg">
              <Controller
                control={control}
                name="config.mappings.0.workflow_definition_id"
                render={({ field }) => (
                  <WorkflowDefinitionSelect
                    projectId={projectId!}
                    value={field.value}
                    onValueChange={field.onChange}
                  />
                )}
              />
            </div>
          </div>
        </div>
      )}

      {/* Conditional Mode - Show Builder */}
      {!isSimpleMode && (
        <ConditionalMappingsBuilder
          projectId={projectId!}
          testPayload={testPayload}
        />
      )}
    </div>
  );
}
