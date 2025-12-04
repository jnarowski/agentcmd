/**
 * GenerateSpecModal Component
 *
 * Full-screen modal for generating specs with:
 * - Template selection (simple, multiphase-planning, multiphase-execution)
 * - AI provider selection (Claude, Codex)
 * - Text input with @ file mentions
 * - Embedded session view for live interaction
 */

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/client/components/ui/dialog";
import { Button } from "@/client/components/ui/button";
import { Textarea } from "@/client/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/client/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/client/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/client/components/ui/command";
import { AgentSessionViewer } from "@/client/components/AgentSessionViewer";
import { useSessionStore } from "@/client/pages/projects/sessions/stores/sessionStore";
import { useSpecTemplates } from "@/client/hooks/useSpecTemplates";
import { useProjectFileSearch } from "@/client/hooks/useProjectFileSearch";
import { useProject } from "@/client/pages/projects/hooks/useProjects";
import { useWebSocket } from "@/client/hooks/useWebSocket";
import { useRescanSpecs } from "@/client/hooks/useRescanSpecs";
import { generateUUID } from "@/client/utils/cn";
import { Channels } from "@/shared/websocket";
import { SessionEventTypes } from "@/shared/types/websocket.types";
import type { AgentType } from "@/shared/types/agent.types";
import {
  XIcon,
  Sparkles,
  AtSign,
  FileText,
  Folder,
  Loader2,
} from "lucide-react";

export interface GenerateSpecModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
}

type ModalState = "input" | "generating";

export function GenerateSpecModal({
  open,
  onOpenChange,
  projectId,
}: GenerateSpecModalProps) {
  // State
  const [modalState, setModalState] = useState<ModalState>("input");
  const [selectedTemplate, setSelectedTemplate] = useState<string>("simple");
  const [selectedAgent, setSelectedAgent] = useState<AgentType>("claude");
  const [description, setDescription] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [fileMenuOpen, setFileMenuOpen] = useState(false);
  const [fileSearchQuery, setFileSearchQuery] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Hooks
  const { data: templates } = useSpecTemplates();
  useProject(projectId); // Fetch project data for context
  const { sendMessage, isConnected } = useWebSocket();
  const rescanMutation = useRescanSpecs();
  const createSession = useSessionStore((s) => s.createSession);
  const addMessage = useSessionStore((s) => s.addMessage);
  const setStreaming = useSessionStore((s) => s.setStreaming);
  const clearSession = useSessionStore((s) => s.clearSession);

  // File search with debounce
  const { data: searchResults, isLoading: isSearchingFiles } = useProjectFileSearch({
    projectId,
    query: fileSearchQuery,
    limit: 20,
    enabled: fileMenuOpen && fileSearchQuery.length >= 1,
  });

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!open) {
      // Delay cleanup for animation
      const timer = setTimeout(() => {
        setModalState("input");
        setDescription("");
        setFileSearchQuery("");
        if (sessionId) {
          clearSession(sessionId);
          setSessionId(null);
        }
        // Rescan specs after modal closes (if generation happened)
        if (modalState === "generating") {
          rescanMutation.mutate();
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [open, sessionId, clearSession, modalState, rescanMutation]);

  // Get template info for display
  const selectedTemplateInfo = useMemo(() => {
    return templates?.find((t) => t.id === selectedTemplate);
  }, [templates, selectedTemplate]);

  // Handle @ file selection
  const handleFileSelect = useCallback(
    (filePath: string) => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = description;

      // Insert @filepath at cursor position
      const newText = text.slice(0, start) + `@${filePath} ` + text.slice(end);
      setDescription(newText);

      // Close menu and reset search
      setFileMenuOpen(false);
      setFileSearchQuery("");

      // Focus back on textarea
      setTimeout(() => {
        textarea.focus();
        const newCursorPos = start + filePath.length + 2; // +2 for @ and space
        textarea.setSelectionRange(newCursorPos, newCursorPos);
      }, 0);
    },
    [description]
  );

  // Handle key events in textarea
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // Open file menu on @ key
      if (e.key === "@") {
        e.preventDefault();
        setFileMenuOpen(true);
      }

      // Submit on Cmd/Ctrl+Enter
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        handleGenerate();
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [description, selectedTemplate, selectedAgent]
  );

  // Generate spec
  const handleGenerate = async () => {
    if (!description.trim() || !isConnected) return;

    try {
      // Create new session
      const newSessionId = generateUUID();

      const session = await createSession(projectId, {
        sessionId: newSessionId,
        agent: selectedAgent,
        permission_mode: "acceptEdits",
      });

      setSessionId(session.id);
      setModalState("generating");

      // Build prompt with template info
      const templatePrompt = buildSpecPrompt(selectedTemplate, description);

      // Add optimistic user message
      addMessage(session.id, {
        id: generateUUID(),
        role: "user",
        content: [{ type: "text", text: templatePrompt }],
        timestamp: Date.now(),
        _original: undefined,
        _optimistic: true,
      });

      // Set streaming state
      setStreaming(session.id, true);

      // Send message via WebSocket
      sendMessage(Channels.session(session.id), {
        type: SessionEventTypes.SEND_MESSAGE,
        data: {
          message: templatePrompt,
          config: {
            resume: false,
            sessionId: session.id,
            permissionMode: "acceptEdits",
          },
        },
      });
    } catch (error) {
      console.error("[GenerateSpecModal] Error creating session:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="!top-0 !left-0 !translate-x-0 !translate-y-0 max-w-[100vw] max-h-[100vh] w-screen h-screen flex flex-col overflow-hidden p-0 safe-area-pt safe-area-pb"
        showCloseButton={false}
      >
        <DialogHeader className="flex flex-row items-center px-6 py-3 border-b shrink-0">
          <DialogTitle className="flex-1 flex items-center gap-2">
            <Sparkles className="size-5" />
            Generate Spec
          </DialogTitle>
          <DialogClose className="ring-offset-background focus:ring-ring rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden">
            <XIcon className="size-4" />
            <span className="sr-only">Close</span>
          </DialogClose>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-hidden">
          {modalState === "input" && (
            <div className="h-full flex flex-col p-6 max-w-3xl mx-auto">
              {/* Template & Agent Selection */}
              <div className="flex flex-wrap gap-4 mb-6">
                {/* Template Selection */}
                <div className="flex-1 min-w-[200px]">
                  <label className="text-sm font-medium mb-2 block">
                    Template
                  </label>
                  <Select
                    value={selectedTemplate}
                    onValueChange={setSelectedTemplate}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select template" />
                    </SelectTrigger>
                    <SelectContent>
                      {templates?.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedTemplateInfo && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {selectedTemplateInfo.description}
                    </p>
                  )}
                </div>

                {/* Agent Selection */}
                <div className="w-[180px]">
                  <label className="text-sm font-medium mb-2 block">
                    AI Provider
                  </label>
                  <Select
                    value={selectedAgent}
                    onValueChange={(v) => setSelectedAgent(v as AgentType)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="claude">Claude</SelectItem>
                      <SelectItem value="codex">Codex</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Description Input */}
              <div className="flex-1 flex flex-col min-h-0">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium">
                    Feature Description
                  </label>
                  <Popover open={fileMenuOpen} onOpenChange={setFileMenuOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-muted-foreground"
                      >
                        <AtSign className="size-4 mr-1" />
                        Add file reference
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent align="end" className="w-[350px] p-0">
                      <Command shouldFilter={false}>
                        <CommandInput
                          placeholder="Search files..."
                          value={fileSearchQuery}
                          onValueChange={setFileSearchQuery}
                        />
                        <CommandList className="max-h-[250px]">
                          {isSearchingFiles && (
                            <div className="p-3 flex items-center gap-2 text-sm text-muted-foreground">
                              <Loader2 className="size-4 animate-spin" />
                              Searching...
                            </div>
                          )}
                          {!isSearchingFiles && searchResults?.length === 0 && (
                            <CommandEmpty>No files found.</CommandEmpty>
                          )}
                          {searchResults && searchResults.length > 0 && (
                            <CommandGroup>
                              {searchResults.map((file) => (
                                <CommandItem
                                  key={file.relativePath}
                                  value={file.relativePath}
                                  onSelect={() =>
                                    handleFileSelect(file.relativePath)
                                  }
                                >
                                  {file.type === "directory" ? (
                                    <Folder className="size-4 mr-2 text-muted-foreground" />
                                  ) : (
                                    <FileText className="size-4 mr-2 text-muted-foreground" />
                                  )}
                                  <span className="truncate">
                                    {file.relativePath}
                                  </span>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          )}
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                <Textarea
                  ref={textareaRef}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Describe the feature, bug, or task you want to create a spec for. Use @ to reference files..."
                  className="flex-1 min-h-[200px] resize-none font-mono text-sm"
                />

                <p className="text-xs text-muted-foreground mt-2">
                  Tip: Press <kbd className="px-1 py-0.5 bg-muted rounded text-xs">@</kbd> to add file references,{" "}
                  <kbd className="px-1 py-0.5 bg-muted rounded text-xs">Cmd+Enter</kbd> to generate
                </p>
              </div>

              {/* Generate Button */}
              <div className="mt-6 flex justify-end">
                <Button
                  onClick={handleGenerate}
                  disabled={!description.trim() || !isConnected}
                  size="lg"
                >
                  <Sparkles className="size-4 mr-2" />
                  Generate Spec
                </Button>
              </div>
            </div>
          )}

          {modalState === "generating" && sessionId && (
            <AgentSessionViewer
              projectId={projectId}
              sessionId={sessionId}
              height="100%"
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// PRIVATE HELPERS
// ============================================================================

function buildSpecPrompt(templateId: string, description: string): string {
  const templateCommands: Record<string, string> = {
    simple: "/cmd:generate-feature-spec",
    "multiphase-planning": "/cmd:generate-prd",
    "multiphase-execution": "/cmd:generate-feature-spec",
  };

  const command = templateCommands[templateId] || "/cmd:generate-feature-spec";

  // Build the prompt with template-specific instructions
  let prompt = `${command} "${description}"`;

  // Add template-specific context
  if (templateId === "multiphase-planning") {
    prompt = `${command}\n\nContext: ${description}\n\nPlease use the multiphase planning approach: first explore the codebase silently, then ask clarifying questions, and finally generate the PRD.`;
  } else if (templateId === "multiphase-execution") {
    prompt = `${command}\n\nContext: ${description}\n\nPlease generate a comprehensive multiphase execution spec with AI handoff prompts for each phase. Include complexity scores and detailed task breakdowns.`;
  }

  return prompt;
}
