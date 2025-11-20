import { Controller, type Control } from "react-hook-form";
import { CopyIcon, CheckIcon } from "lucide-react";
import { useState } from "react";
import { Field, FieldContent, FieldLabel, FieldDescription } from "@/client/components/ui/field";
import { Input } from "@/client/components/ui/input";
import { Textarea } from "@/client/components/ui/textarea";
import { InputGroup, InputGroupInput, InputGroupAddon, InputGroupButton } from "@/client/components/ui/input-group";
import type { UpdateWebhookFormValues } from "../../schemas/webhook.schemas";
import type { WebhookSource } from "../../types/webhook.types";

interface WebhookBasicInfoSectionProps {
  control: Control<UpdateWebhookFormValues>;
  webhookUrl?: string;
  webhookSecret?: string;
  currentSource?: WebhookSource;
  isEditMode?: boolean;
}

const sourceOptions = [
  { value: "github" as const, label: "GitHub", description: "GitHub webhook events" },
  { value: "linear" as const, label: "Linear", description: "Linear issue events" },
  { value: "jira" as const, label: "Jira", description: "Jira issue events" },
  { value: "generic" as const, label: "Generic", description: "Custom webhook payloads" },
] as const;

export function WebhookBasicInfoSection({
  control,
  webhookUrl,
  webhookSecret,
  currentSource,
  isEditMode = true,
}: WebhookBasicInfoSectionProps) {
  const [urlCopied, setUrlCopied] = useState(false);
  const [isEditingSecret, setIsEditingSecret] = useState(false);

  const handleCopyUrl = async () => {
    if (!webhookUrl) return;
    await navigator.clipboard.writeText(webhookUrl);
    setUrlCopied(true);
    setTimeout(() => setUrlCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      {/* Name */}
      <Controller
        control={control}
        name="name"
        render={({ field, fieldState }) => (
          <Field data-invalid={!!fieldState.error}>
            <FieldLabel>Name</FieldLabel>
            <FieldContent>
              <Input
                {...field}
                placeholder="e.g., GitHub PR Webhook"
              />
              {fieldState.error && (
                <p className="text-sm text-destructive">{fieldState.error.message}</p>
              )}
            </FieldContent>
          </Field>
        )}
      />

      {/* Description */}
      <Controller
        control={control}
        name="description"
        render={({ field }) => (
          <Field>
            <FieldLabel>Description (optional)</FieldLabel>
            <FieldContent>
              <Textarea
                {...field}
                value={field.value || ""}
                placeholder="Brief description of what this webhook does"
                rows={3}
              />
            </FieldContent>
          </Field>
        )}
      />

      {/* Source - Editable in create mode, read-only in edit mode */}
      {!isEditMode ? (
        <Controller
          control={control}
          name="source"
          render={({ field, fieldState }) => (
            <Field data-invalid={!!fieldState.error}>
              <FieldLabel>Source</FieldLabel>
              <FieldContent>
                <select
                  {...field}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {sourceOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <FieldDescription>
                  The external service that will send webhook events
                </FieldDescription>
                {fieldState.error && (
                  <p className="text-sm text-destructive">{fieldState.error.message}</p>
                )}
              </FieldContent>
            </Field>
          )}
        />
      ) : (
        <Field>
          <FieldLabel>Source</FieldLabel>
          <FieldContent>
            <Input
              value={sourceOptions.find(opt => opt.value === currentSource)?.label || currentSource || ''}
              disabled
              className="bg-muted"
            />
            <FieldDescription>
              Webhook source cannot be changed after creation
            </FieldDescription>
          </FieldContent>
        </Field>
      )}

      {/* Webhook URL - Only show in edit mode */}
      {isEditMode && webhookUrl && (
        <Field>
          <FieldLabel>Webhook URL</FieldLabel>
          <FieldContent>
            <InputGroup>
              <InputGroupInput
                value={webhookUrl}
                readOnly
                className="font-mono text-sm bg-muted"
              />
              <InputGroupAddon align="inline-end">
                <InputGroupButton
                  size="icon-sm"
                  onClick={handleCopyUrl}
                  aria-label="Copy webhook URL"
                >
                  {urlCopied ? (
                    <CheckIcon className="h-4 w-4" />
                  ) : (
                    <CopyIcon className="h-4 w-4" />
                  )}
                </InputGroupButton>
              </InputGroupAddon>
            </InputGroup>
            <FieldDescription>
              Configure this URL in your external service to send webhooks
            </FieldDescription>
          </FieldContent>
        </Field>
      )}

      {/* Webhook Secret */}
      <Controller
        control={control}
        name="secret"
        render={({ field, fieldState }) => {
          const hasExistingSecret = isEditMode && webhookSecret && !isEditingSecret;

          return (
            <Field data-invalid={!!fieldState.error}>
              <FieldLabel>Secret</FieldLabel>
              <FieldContent>
                {hasExistingSecret ? (
                  <InputGroup>
                    <InputGroupInput
                      type="password"
                      value="••••••••••••••••"
                      disabled
                      className="bg-muted"
                    />
                    <InputGroupAddon align="inline-end">
                      <InputGroupButton
                        onClick={() => {
                          setIsEditingSecret(true);
                          field.onChange("");
                        }}
                      >
                        Edit
                      </InputGroupButton>
                    </InputGroupAddon>
                  </InputGroup>
                ) : (
                  <Input
                    {...field}
                    type="password"
                    value={field.value || ""}
                    placeholder={isEditMode ? "Enter new secret" : "Paste secret from external service"}
                  />
                )}
                <FieldDescription>
                  {isEditMode ? (
                    hasExistingSecret ? "Click 'Edit' to change or clear the secret" : "Enter a new secret or leave blank to keep current"
                  ) : (
                    "Used to verify webhook signatures"
                  )}
                </FieldDescription>
                {fieldState.error && (
                  <p className="text-sm text-destructive">{fieldState.error.message}</p>
                )}
              </FieldContent>
            </Field>
          );
        }}
      />
    </div>
  );
}
