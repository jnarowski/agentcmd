import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/client/components/ui/dialog";
import { CodeBlock } from "@/client/pages/projects/sessions/components/CodeBlock";

interface PayloadViewDialogProps {
  payload: Record<string, unknown> | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PayloadViewDialog({
  payload,
  open,
  onOpenChange,
}: PayloadViewDialogProps) {
  const formattedPayload = payload ? JSON.stringify(payload, null, 2) : "{}";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Webhook Payload</DialogTitle>
          <DialogDescription>
            View the raw JSON payload received by this webhook
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4">
          <CodeBlock
            code={formattedPayload}
            language="json"
            showLineNumbers={false}
            showHeader={false}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
