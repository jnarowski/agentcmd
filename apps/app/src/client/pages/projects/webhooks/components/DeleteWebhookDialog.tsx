import { DeleteDialog } from "@/client/components/DeleteDialog";
import { useWebhookMutations } from "../hooks/useWebhookMutations";
import type { Webhook } from "../types/webhook.types";

interface DeleteWebhookDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  webhook: Webhook;
  onSuccess?: () => void;
}

export function DeleteWebhookDialog({
  open,
  onOpenChange,
  webhook,
  onSuccess,
}: DeleteWebhookDialogProps) {
  const { deleteMutation } = useWebhookMutations(webhook.project_id, {
    onDeleteSuccess: () => {
      onSuccess?.(); // Navigate first (passed from parent)
      onOpenChange(false); // Then close dialog
    },
  });

  const handleDelete = () => {
    deleteMutation.mutate({ webhookId: webhook.id });
  };

  return (
    <DeleteDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Delete webhook?"
      description={
        <>
          <div>
            This will permanently delete the webhook{" "}
            <span className="font-semibold">{webhook.name}</span>.
          </div>
          <div className="text-sm text-muted-foreground">
            All webhook events and configuration will be removed.
          </div>
        </>
      }
      onConfirm={handleDelete}
      isPending={deleteMutation.isPending}
    />
  );
}
