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
import { CodeBlock } from "@/client/pages/projects/sessions/components/CodeBlock";
import { ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";

interface EventDetailDialogProps {
  event: WebhookEvent;
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EventDetailDialog({ event, projectId, open, onOpenChange }: EventDetailDialogProps) {
  const [activeTab, setActiveTab] = useState("overview");

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
          <div className="flex items-center gap-3 pr-8">
            <DialogTitle>Event Details</DialogTitle>
            <Badge
              variant="secondary"
              className={
                event.status === "success"
                  ? "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20"
                  : event.status === "failed"
                  ? "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20"
                  : event.status === "test"
                  ? "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20"
                  : ""
              }
            >
              {event.status}
            </Badge>
          </div>
          <div className="text-sm text-muted-foreground">{formatDate(event.created_at)}</div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="payload">Payload</TabsTrigger>
            <TabsTrigger value="headers">Headers</TabsTrigger>
            {event.mapped_data && <TabsTrigger value="mapped">Mapped Data</TabsTrigger>}
            {event.error_message && <TabsTrigger value="error">Error</TabsTrigger>}
          </TabsList>

          <TabsContent value="overview" className="flex-1 overflow-auto mt-4">
            <div className="space-y-6">
              {/* Event Info */}
              <div className="space-y-4">
                <div className="grid grid-cols-[140px_1fr] gap-y-3 text-sm">
                  <div className="text-muted-foreground">Status</div>
                  <div>
                    <Badge
                      variant="secondary"
                      className={
                        event.status === "success"
                          ? "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20"
                          : event.status === "failed"
                          ? "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20"
                          : event.status === "test"
                          ? "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20"
                          : ""
                      }
                    >
                      {event.status}
                    </Badge>
                  </div>

                  <div className="text-muted-foreground">Event ID</div>
                  <div className="font-mono text-xs">{event.id}</div>

                  <div className="text-muted-foreground">Received At</div>
                  <div>{formatDate(event.created_at)}</div>

                  {event.processing_time_ms !== null && (
                    <>
                      <div className="text-muted-foreground">Processing Time</div>
                      <div>{event.processing_time_ms}ms</div>
                    </>
                  )}
                </div>
              </div>

              {/* Workflow Run Info */}
              {event.workflow_run_id && (
                <div className="border-t pt-4">
                  <h4 className="text-sm font-medium mb-3">Workflow Run</h4>
                  <div className="grid grid-cols-[140px_1fr] gap-y-3 text-sm">
                    <div className="text-muted-foreground">Run ID</div>
                    <div className="flex items-center gap-2">
                      <code className="text-xs bg-muted px-2 py-1 rounded">{event.workflow_run_id}</code>
                      <Link
                        to={`/projects/${projectId}/workflow-runs/${event.workflow_run_id}`}
                        className="text-primary hover:underline inline-flex items-center gap-1"
                      >
                        View Run
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>
                </div>
              )}

              {/* Mapping Info */}
              {event.mapped_data && (
                <div className="border-t pt-4">
                  <h4 className="text-sm font-medium mb-3">Mapped Fields</h4>
                  <div className="space-y-2">
                    {Object.entries(event.mapped_data).map(([key, value]) => (
                      <div key={key} className="grid grid-cols-[140px_1fr] gap-3 text-sm">
                        <div className="text-muted-foreground truncate">{key}</div>
                        <div className="font-mono text-xs bg-muted px-2 py-1 rounded truncate">
                          {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="payload" className="flex-1 overflow-auto mt-4">
            <CodeBlock code={formatJson(event.payload)} language="json" showLineNumbers={true} />
          </TabsContent>

          <TabsContent value="headers" className="flex-1 overflow-auto mt-4">
            <CodeBlock code={formatJson(event.headers)} language="json" showLineNumbers={true} />
          </TabsContent>

          {event.mapped_data && (
            <TabsContent value="mapped" className="flex-1 overflow-auto mt-4">
              <CodeBlock code={formatJson(event.mapped_data)} language="json" showLineNumbers={true} />
            </TabsContent>
          )}

          {event.error_message && (
            <TabsContent value="error" className="flex-1 overflow-auto mt-4">
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                <div className="text-sm font-medium text-destructive mb-2">Error Message</div>
                <div className="text-sm text-destructive/90">{event.error_message}</div>
              </div>
            </TabsContent>
          )}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
