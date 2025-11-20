import { useState } from "react";
import { Copy, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/client/components/ui/dialog";
import { Button } from "@/client/components/ui/button";
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
  const [copied, setCopied] = useState(false);
  const formattedPayload = payload ? JSON.stringify(payload, null, 2) : "{}";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(formattedPayload);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Webhook Payload</DialogTitle>
          <DialogDescription>
            View the raw JSON payload received by this webhook
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4 flex-1 min-h-0 relative">
          <Button
            variant="outline"
            size="sm"
            className="absolute top-2 right-2 z-10 h-8 px-3"
            onClick={handleCopy}
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 mr-2" />
                Copied
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-2" />
                Copy
              </>
            )}
          </Button>
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
