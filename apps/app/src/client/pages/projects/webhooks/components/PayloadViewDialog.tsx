import { Copy, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/client/components/ui/dialog";
import { CodeBlock } from "@/client/pages/projects/sessions/components/CodeBlock";
import { useCopy } from "@/client/hooks/useCopy";

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
  const { copied, copy } = useCopy();
  const formattedPayload = payload ? JSON.stringify(payload, null, 2) : "{}";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Webhook Payload</DialogTitle>
          <DialogDescription>
            View the raw JSON payload received by this webhook
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4 flex-1 min-h-0 overflow-auto relative">
          <div className="absolute top-2 right-6 z-10">
            <button
              onClick={() => copy(formattedPayload)}
              className="p-1.5 hover:bg-muted rounded-md transition-colors"
              title="Copy to clipboard"
            >
              {copied ? (
                <Check className="w-3 h-3 text-green-600" />
              ) : (
                <Copy className="w-3 h-3 text-muted-foreground" />
              )}
            </button>
          </div>
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
