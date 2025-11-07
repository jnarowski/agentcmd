import { useState, useMemo } from "react";
import { SessionListItem } from "@/client/pages/projects/sessions/components/SessionListItem";
import { Input } from "@/client/components/ui/input";
import { Checkbox } from "@/client/components/ui/checkbox";
import { Label } from "@/client/components/ui/label";
import { Badge } from "@/client/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/client/components/ui/select";
import { Search, Filter } from "lucide-react";
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
  const [showArchived, setShowArchived] = useState(false);

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

  const filteredSessions = useMemo(() => {
    let result = [...sessions];

    // Filter out archived sessions unless showArchived is true
    if (!showArchived) {
      result = result.filter((s) => !s.is_archived);
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

    // Sort by lastMessageAt (newest first)
    result.sort(
      (a, b) =>
        new Date(b.metadata.lastMessageAt).getTime() -
        new Date(a.metadata.lastMessageAt).getTime()
    );

    return result;
  }, [sessions, searchTerm, selectedState, selectedAgent, showArchived]);

  const activeFilterCount =
    (searchTerm.trim() ? 1 : 0) +
    (selectedState !== "all" ? 1 : 0) +
    (selectedAgent !== "all" ? 1 : 0) +
    (showArchived ? 1 : 0);

  if (!sessions || sessions.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-sm text-muted-foreground">
          No sessions yet. Start a new chat to see it here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter Controls */}
      <div className="space-y-3 p-4 border border-border/50 rounded-lg bg-background/50">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-medium">Filters</h3>
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              {activeFilterCount} active
            </Badge>
          )}
        </div>

        {/* Filter Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
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

          {/* Show Archived Checkbox */}
          <div className="md:col-span-1 flex items-center space-x-2 px-3 border border-border/50 rounded-md bg-background">
            <Checkbox
              id="show-archived"
              checked={showArchived}
              onCheckedChange={(checked) => setShowArchived(checked === true)}
            />
            <Label
              htmlFor="show-archived"
              className="text-sm font-normal cursor-pointer"
            >
              Show archived
            </Label>
          </div>
        </div>
      </div>

      {/* Session Count */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          Showing {filteredSessions.length} of {sessions.length} sessions
        </span>
      </div>

      {/* Session List */}
      {filteredSessions.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-sm text-muted-foreground">
            No sessions match your filters. Try adjusting the filters above.
          </p>
        </div>
      ) : (
        <div className="space-y-0 -mx-2">
          {filteredSessions.map((session) => (
            <div key={session.id} className="relative">
              <SessionListItem session={session} projectId={projectId} />
              {session.is_archived && showArchived && (
                <Badge
                  variant="outline"
                  className="absolute top-2 right-2 text-xs"
                >
                  Archived
                </Badge>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
