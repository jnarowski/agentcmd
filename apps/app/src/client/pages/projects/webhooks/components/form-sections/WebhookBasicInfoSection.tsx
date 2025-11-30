import { Controller, type Control } from "react-hook-form";
import { CopyIcon, CheckIcon } from "lucide-react";
import { useState } from "react";
import { Field, FieldContent, FieldLabel, FieldDescription } from "@/client/components/ui/field";
import { useCopy } from "@/client/hooks/useCopy";
import { Input } from "@/client/components/ui/input";
import { Textarea } from "@/client/components/ui/textarea";
import { InputGroup, InputGroupInput, InputGroupAddon, InputGroupButton } from "@/client/components/ui/input-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/client/components/ui/select";
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
  const [isEditingSecret, setIsEditingSecret] = useState(false);
  const { copied: urlCopied, copy: copyUrl } = useCopy();

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
              <div className="max-w-md">
                <Input
                  {...field}
                  placeholder="e.g., GitHub PR Webhook"
                />
              </div>
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
                <div className="max-w-sm">
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a source" />
                    </SelectTrigger>
                    <SelectContent>
                      {sourceOptions.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
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
            <div className="max-w-sm">
              <Input
                value={sourceOptions.find(opt => opt.value === currentSource)?.label || currentSource || ''}
                disabled
                className="bg-muted"
              />
            </div>
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
                  onClick={() => webhookUrl && copyUrl(webhookUrl)}
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
