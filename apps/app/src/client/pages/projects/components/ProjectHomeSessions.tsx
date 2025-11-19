import { useState, useMemo } from "react";
import { SessionListItem } from "@/client/pages/projects/sessions/components/SessionListItem";
import { Input } from "@/client/components/ui/input";
import { Badge } from "@/client/components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/client/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/client/components/ui/select";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
} from "@/client/components/ui/empty";
import { Button } from "@/client/components/ui/button";
import { Search, X, MessageSquare } from "lucide-react";
import { truncate } from "@/client/utils/truncate";
import type { SessionResponse } from "@/shared/types";

interface ProjectHomeSessionsProps {
  sessions: SessionResponse[];
  projectId: string;
}

export function ProjectHomeSessions({
  sessions,
  projectId,
}: ProjectHomeSessionsProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedState, setSelectedState] = useState<string>("all");
  const [selectedAgent, setSelectedAgent] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [archivedFilter, setArchivedFilter] = useState<string>("active");

  const stateOptions: { value: string; label: string }[] = [
    { value: "all", label: "All States" },
    { value: "idle", label: "Idle" },
    { value: "working", label: "Working" },
    { value: "error", label: "Error" },
  ];

  const agentOptions: { value: string; label: string }[] = [
    { value: "all", label: "All Agents" },
    { value: "claude", label: "Claude" },
    { value: "codex", label: "Codex" },
    { value: "gemini", label: "Gemini" },
    { value: "cursor", label: "Cursor" },
  ];

  const typeOptions: { value: string; label: string }[] = [
    { value: "all", label: "All Types" },
    { value: "chat", label: "Chat" },
    { value: "planning", label: "Planning" },
    { value: "workflow", label: "Workflow" },
  ];

  const archivedOptions: { value: string; label: string }[] = [
    { value: "active", label: "Active" },
    { value: "archived", label: "Archived" },
  ];

  const filteredSessions = useMemo(() => {
    let result = [...sessions];

    // Archive filter
    if (archivedFilter === "active") {
      result = result.filter((s) => !s.is_archived);
    } else if (archivedFilter === "archived") {
      result = result.filter((s) => s.is_archived);
    }

    // Text search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (s) =>
          s.name?.toLowerCase().includes(term) ||
          s.metadata.firstMessagePreview?.toLowerCase().includes(term)
      );
    }

    // State filter
    if (selectedState !== "all") {
      result = result.filter((s) => s.state === selectedState);
    }

    // Agent filter
    if (selectedAgent !== "all") {
      result = result.filter((s) => s.agent === selectedAgent);
    }

    // Type filter
    if (selectedType !== "all") {
      result = result.filter((s) => s.type === selectedType);
    }

    // Sort by lastMessageAt (newest first)
    result.sort(
      (a, b) =>
        new Date(b.metadata.lastMessageAt).getTime() -
        new Date(a.metadata.lastMessageAt).getTime()
    );

    return result;
  }, [sessions, searchTerm, selectedState, selectedAgent, selectedType, archivedFilter]);

  const activeFilterCount =
    (searchTerm.trim() ? 1 : 0) +
    (selectedState !== "all" ? 1 : 0) +
    (selectedAgent !== "all" ? 1 : 0) +
    (selectedType !== "all" ? 1 : 0) +
    (archivedFilter !== "active" ? 1 : 0);

  const clearAllFilters = () => {
    setSearchTerm("");
    setSelectedState("all");
    setSelectedAgent("all");
    setSelectedType("all");
    setArchivedFilter("active");
  };

  if (!sessions || sessions.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>No sessions yet</EmptyTitle>
          <EmptyDescription>
            Start a new chat to see it here.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
          <MessageSquare className="h-5 w-5 shrink-0" />
          <span className="truncate">Sessions</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Filter Controls */}
          <div className="space-y-3">
        {/* Filter Row */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {/* Search Input */}
          <div className="relative md:col-span-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search sessions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 w-full"
            />
          </div>

          {/* State Filter */}
          <div className="md:col-span-1">
            <Select value={selectedState} onValueChange={setSelectedState}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Filter by state" />
              </SelectTrigger>
              <SelectContent>
                {stateOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Agent Filter */}
          <div className="md:col-span-1">
            <Select value={selectedAgent} onValueChange={setSelectedAgent}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Filter by agent" />
              </SelectTrigger>
              <SelectContent>
                {agentOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Type Filter */}
          <div className="md:col-span-1">
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                {typeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Archived Filter */}
          <div className="md:col-span-1">
            <Select value={archivedFilter} onValueChange={setArchivedFilter}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                {archivedOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Active Filters Bar */}
      {activeFilterCount > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground">Active filters:</span>

          {searchTerm.trim() && (
            <Badge variant="secondary" className="text-xs gap-1">
              Search: {truncate(searchTerm, 20)}
              <button
                onClick={() => setSearchTerm("")}
                className="ml-1 hover:bg-muted-foreground/20 rounded-sm"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}

          {selectedState !== "all" && (
            <Badge variant="secondary" className="text-xs gap-1">
              State: {stateOptions.find((o) => o.value === selectedState)?.label}
              <button
                onClick={() => setSelectedState("all")}
                className="ml-1 hover:bg-muted-foreground/20 rounded-sm"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}

          {selectedAgent !== "all" && (
            <Badge variant="secondary" className="text-xs gap-1">
              Agent: {agentOptions.find((o) => o.value === selectedAgent)?.label}
              <button
                onClick={() => setSelectedAgent("all")}
                className="ml-1 hover:bg-muted-foreground/20 rounded-sm"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}

          {selectedType !== "all" && (
            <Badge variant="secondary" className="text-xs gap-1">
              Type: {typeOptions.find((o) => o.value === selectedType)?.label}
              <button
                onClick={() => setSelectedType("all")}
                className="ml-1 hover:bg-muted-foreground/20 rounded-sm"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}

          {archivedFilter !== "active" && (
            <Badge variant="secondary" className="text-xs gap-1">
              Status: {archivedOptions.find((o) => o.value === archivedFilter)?.label}
              <button
                onClick={() => setArchivedFilter("active")}
                className="ml-1 hover:bg-muted-foreground/20 rounded-sm"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            className="h-6 text-xs"
          >
            Clear all
          </Button>
        </div>
      )}

      {/* Session List */}
      {filteredSessions.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>No sessions found</EmptyTitle>
            <EmptyDescription>
              No sessions match your filters. Try adjusting the filters above.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="space-y-0 -mx-2">
          {filteredSessions.map((session) => (
            <SessionListItem key={session.id} session={session} projectId={projectId} />
          ))}
        </div>
      )}

          {/* Session Count */}
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              Showing {filteredSessions.length} of {sessions.length} sessions
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
