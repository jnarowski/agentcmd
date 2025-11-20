import { useState } from "react";
import type { WebhookEvent } from "../types/webhook.types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/client/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/client/components/ui/tabs";
import { Badge } from "@/client/components/ui/badge";

interface EventDetailDialogProps {
  event: WebhookEvent;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EventDetailDialog({ event, open, onOpenChange }: EventDetailDialogProps) {
  const [activeTab, setActiveTab] = useState("payload");

  const formatJson = (data: unknown) => {
    if (!data) return "null";
    if (typeof data === "string") {
      try {
        return JSON.stringify(JSON.parse(data), null, 2);
      } catch {
        return data;
      }
    }
    return JSON.stringify(data, null, 2);
  };

  const formatDate = (date: Date | string) => {
    return new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
      timeStyle: "medium",
    }).format(new Date(date));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Event Details</DialogTitle>
            <Badge
              variant="secondary"
              className={
                event.status === "success"
                  ? "bg-green-100 text-green-800"
                  : event.status === "failed"
                  ? "bg-red-100 text-red-800"
                  : event.status === "test"
                  ? "bg-blue-100 text-blue-800"
                  : "bg-gray-100 text-gray-800"
              }
            >
              {event.status}
            </Badge>
          </div>
          <div className="text-sm text-gray-500">{formatDate(event.created_at)}</div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
          <TabsList>
            <TabsTrigger value="payload">Payload</TabsTrigger>
            <TabsTrigger value="headers">Headers</TabsTrigger>
            {event.mapped_data && <TabsTrigger value="mapped">Mapped Data</TabsTrigger>}
            {event.error_message && <TabsTrigger value="error">Error</TabsTrigger>}
          </TabsList>

          <TabsContent value="payload" className="flex-1 overflow-auto mt-4">
            <pre className="text-xs bg-gray-50 p-4 rounded-lg overflow-auto">
              <code>{formatJson(event.payload)}</code>
            </pre>
          </TabsContent>

          <TabsContent value="headers" className="flex-1 overflow-auto mt-4">
            <pre className="text-xs bg-gray-50 p-4 rounded-lg overflow-auto">
              <code>{formatJson(event.headers)}</code>
            </pre>
          </TabsContent>

          {event.mapped_data && (
            <TabsContent value="mapped" className="flex-1 overflow-auto mt-4">
              <pre className="text-xs bg-gray-50 p-4 rounded-lg overflow-auto">
                <code>{formatJson(event.mapped_data)}</code>
              </pre>
            </TabsContent>
          )}

          {event.error_message && (
            <TabsContent value="error" className="flex-1 overflow-auto mt-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="text-sm font-medium text-red-800 mb-2">Error Message</div>
                <div className="text-sm text-red-700">{event.error_message}</div>
              </div>
            </TabsContent>
          )}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
