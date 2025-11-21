import { useState, useEffect } from "react";
import { Button } from "@/client/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/client/components/ui/select";
import { useWebhookEvents } from "../hooks/useWebhookEvents";
import { PayloadViewDialog } from "./PayloadViewDialog";
import { formatDistanceToNow } from "date-fns";

interface TestPayloadSelectorProps {
  webhookId: string;
  onPayloadSelect: (payload: Record<string, unknown> | null) => void;
}

export function TestPayloadSelector({
  webhookId,
  onPayloadSelect,
}: TestPayloadSelectorProps) {
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data, isLoading } = useWebhookEvents({
    webhookId,
    limit: 10,
  });

  const events = data?.events || [];
  const selectedEvent = events.find((e) => e.id === selectedEventId);
  const firstEventId = events[0]?.id;

  // Auto-select first event when events load
  useEffect(() => {
    if (firstEventId && !selectedEventId) {
      setSelectedEventId(firstEventId);
    }
  }, [firstEventId, selectedEventId]);

  // Update parent when selection changes
  useEffect(() => {
    if (selectedEvent) {
      onPayloadSelect(selectedEvent.payload as Record<string, unknown>);
    } else {
      onPayloadSelect(null);
    }
  }, [selectedEvent, onPayloadSelect]);

  return (
    <div className="flex items-center gap-2">
      <Select
        value={selectedEventId || ""}
        onValueChange={(value) => setSelectedEventId(value || null)}
        disabled={isLoading || events.length === 0}
      >
        <SelectTrigger className="w-full">
          <SelectValue
            placeholder={
              isLoading
                ? "Loading events..."
                : events.length === 0
                  ? "No test events yet"
                  : "Select test payload..."
            }
          />
        </SelectTrigger>
        <SelectContent>
          {events.map((event) => (
            <SelectItem key={event.id} value={event.id}>
              {formatDistanceToNow(new Date(event.created_at), {
                addSuffix: true,
              })}{" "}
              - {event.status}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        variant="outline"
        onClick={() => setDialogOpen(true)}
        disabled={!selectedEvent}
      >
        View JSON
      </Button>
      <PayloadViewDialog
        payload={(selectedEvent?.payload as Record<string, unknown>) || null}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  );
}
