import { useState } from "react";
import { AlertCircle, CheckCircle, XCircle, Filter, ChevronLeft, ChevronRight } from "lucide-react";
import { useWebhookEvents } from "../hooks/useWebhookEvents";
import type { WebhookEventStatus, WebhookEvent } from "../types/webhook.types";
import { Badge } from "@/client/components/ui/badge";
import { Button } from "@/client/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/client/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/client/components/ui/select";
import { EventDetailDialog } from "./EventDetailDialog";

interface EventHistoryProps {
  webhookId: string;
  projectId: string;
}

const STATUS_COLORS: Record<WebhookEventStatus, { bg: string; text: string; icon: typeof CheckCircle }> = {
  test: { bg: "bg-blue-100", text: "text-blue-800", icon: AlertCircle },
  success: { bg: "bg-green-100", text: "text-green-800", icon: CheckCircle },
  filtered: { bg: "bg-gray-100", text: "text-gray-800", icon: Filter },
  failed: { bg: "bg-red-100", text: "text-red-800", icon: XCircle },
  error: { bg: "bg-red-100", text: "text-red-800", icon: XCircle },
  invalid_signature: { bg: "bg-orange-100", text: "text-orange-800", icon: AlertCircle },
};

export function EventHistory({ webhookId, projectId }: EventHistoryProps) {
  const [statusFilter, setStatusFilter] = useState<WebhookEventStatus | "all">("all");
  const [selectedEvent, setSelectedEvent] = useState<WebhookEvent | null>(null);
  const [page, setPage] = useState(0);
  const limit = 20;

  const { data, isLoading } = useWebhookEvents({
    webhookId,
    status: statusFilter === "all" ? undefined : statusFilter,
    limit,
    offset: page * limit,
  });

  const events = data?.events ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / limit);

  const formatDate = (date: Date | string) => {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(new Date(date));
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Event History</CardTitle>
            <Select
              value={statusFilter}
              onValueChange={(value) => {
                setStatusFilter(value as WebhookEventStatus | "all");
                setPage(0);
              }}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="All events" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All events</SelectItem>
                <SelectItem value="test">Test</SelectItem>
                <SelectItem value="success">Success</SelectItem>
                <SelectItem value="filtered">Filtered</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />
              ))}
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Filter className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p className="text-sm">No events yet</p>
              {statusFilter !== "all" && (
                <p className="text-xs mt-1">Try changing the filter</p>
              )}
            </div>
          ) : (
            <>
              <div className="space-y-1">
                {events.map((event) => {
                  const statusConfig = STATUS_COLORS[event.status];
                  const StatusIcon = statusConfig.icon;

                  return (
                    <button
                      key={event.id}
                      onClick={() => setSelectedEvent(event)}
                      className="w-full p-3 rounded-lg border hover:bg-gray-50 transition-colors text-left flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <StatusIcon className={`w-4 h-4 flex-shrink-0 ${statusConfig.text}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <Badge
                              variant="secondary"
                              className={`${statusConfig.bg} ${statusConfig.text} border-0`}
                            >
                              {event.status}
                            </Badge>
                            <span className="text-xs text-gray-500 truncate">
                              {formatDate(event.created_at)}
                            </span>
                          </div>
                          {event.error_message && (
                            <p className="text-xs text-red-600 mt-1 truncate">
                              {event.error_message}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-xs text-gray-400">View details →</div>
                    </button>
                  );
                })}
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <div className="text-sm text-gray-600">
                    Page {page + 1} of {totalPages} ({total} total)
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(0, p - 1))}
                      disabled={page === 0}
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                      disabled={page >= totalPages - 1}
                    >
                      Next
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {selectedEvent && (
        <EventDetailDialog
          event={selectedEvent}
          projectId={projectId}
          open={!!selectedEvent}
          onOpenChange={(open) => !open && setSelectedEvent(null)}
        />
      )}
    </>
  );
}
