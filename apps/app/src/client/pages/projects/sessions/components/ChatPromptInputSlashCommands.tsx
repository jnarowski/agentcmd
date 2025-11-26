"use client";

import {
  PromptInputButton,
  PromptInputCommand,
  PromptInputCommandEmpty,
  PromptInputCommandGroup,
  PromptInputCommandInput,
  PromptInputCommandItem,
  PromptInputCommandList,
  PromptInputCommandSeparator,
} from "@/client/components/ai-elements/PromptInput";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/client/components/ui/popover";
import { SlashIcon, CornerDownLeft } from "lucide-react";
import { useEffect, useRef, useState, useMemo } from "react";
import { useSlashCommands } from "@/client/pages/projects/sessions/hooks/useSlashCommands";
import Fuse from "fuse.js";

interface ChatPromptInputSlashCommandsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string | undefined;
  onCommandSelect: (options: { command: string; immediateSubmit: boolean }) => void;
}

export const ChatPromptInputSlashCommands = ({
  open,
  onOpenChange,
  projectId,
  onCommandSelect,
}: ChatPromptInputSlashCommandsProps) => {
  const commandInputRef = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch slash commands (built-in + custom)
  const { data, isLoading, error } = useSlashCommands(projectId);
  const commands = useMemo(() => data || [], [data]);

  // Setup Fuse.js search
  const fuse = useMemo(() => {
    return new Fuse(commands, {
      keys: [
        { name: "name", weight: 0.4 },
        { name: "fullCommand", weight: 0.3 },
        { name: "description", weight: 0.3 },
      ],
      threshold: 0.3,
      includeScore: true,
    });
  }, [commands]);

  // Filter commands based on search query
  const filteredCommands = useMemo(() => {
    if (!searchQuery) {
      return commands;
    }
    const results = fuse.search(searchQuery);
    return results.map((result) => result.item);
  }, [searchQuery, fuse, commands]);

  // Split into builtin and custom commands
  const builtinCommands = useMemo(() => {
    return filteredCommands.filter((cmd) => cmd.type === "builtin");
  }, [filteredCommands]);

  const customCommands = useMemo(() => {
    return filteredCommands.filter((cmd) => cmd.type === "custom");
  }, [filteredCommands]);

  // Focus command input when menu opens
  useEffect(() => {
    if (open && commandInputRef.current) {
      setTimeout(() => {
        commandInputRef.current?.focus();
      }, 0);
    }
  }, [open]);

  // Reset search when menu closes
  useEffect(() => {
    if (!open) {
      setSearchQuery("");
    }
  }, [open]);

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <PromptInputButton size="icon-responsive">
          <SlashIcon size={20} className="md:size-4" />
        </PromptInputButton>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[calc(100vw-2rem)] md:w-[450px] p-0">
        <PromptInputCommand>
          <PromptInputCommandInput
            ref={commandInputRef}
            className="border-none focus-visible:ring-0"
            placeholder="Search commands..."
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <PromptInputCommandList>
            {isLoading && (
              <div className="p-3 text-muted-foreground text-sm">
                Loading commands...
              </div>
            )}
            {error && (
              <div className="p-3 text-destructive text-sm">
                Error loading commands: {error.message}
              </div>
            )}
            {!isLoading && !error && commands.length === 0 && (
              <PromptInputCommandEmpty className="p-3 text-muted-foreground text-sm">
                No commands found.
              </PromptInputCommandEmpty>
            )}
            {!isLoading &&
              !error &&
              commands.length > 0 &&
              filteredCommands.length === 0 && (
                <PromptInputCommandEmpty className="p-3 text-muted-foreground text-sm">
                  No results found.
                </PromptInputCommandEmpty>
              )}

            {/* Project Commands Section */}
            {customCommands.length > 0 && (
              <PromptInputCommandGroup heading="Project Commands">
                {customCommands.map((command) => (
                  <PromptInputCommandItem
                    key={command.fullCommand}
                    onSelect={() => onCommandSelect({ command: command.fullCommand, immediateSubmit: false })}
                    className="py-2.5"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="font-medium text-sm">
                          {command.fullCommand}
                        </span>
                        {command.argumentHints &&
                          command.argumentHints.length > 0 && (
                            <span className="text-muted-foreground text-2xs mb-0.5">
                              {command.argumentHints
                                .map((arg) => `[${arg}]`)
                                .join(" ")}
                            </span>
                          )}
                        <span className="text-muted-foreground text-xs">
                          {command.description}
                        </span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onCommandSelect({ command: command.fullCommand, immediateSubmit: true });
                        }}
                        className="flex-shrink-0 p-1.5 rounded hover:bg-accent transition-colors"
                        title="Add command and submit"
                      >
                        <CornerDownLeft size={14} className="text-muted-foreground" />
                      </button>
                    </div>
                  </PromptInputCommandItem>
                ))}
              </PromptInputCommandGroup>
            )}

            {/* Separator between project and built-in */}
            {customCommands.length > 0 && builtinCommands.length > 0 && (
              <PromptInputCommandSeparator />
            )}

            {/* Built-in Commands Section */}
            {builtinCommands.length > 0 && (
              <PromptInputCommandGroup heading="Built-in Commands">
                {builtinCommands.map((command) => (
                  <PromptInputCommandItem
                    key={command.fullCommand}
                    onSelect={() => onCommandSelect({ command: command.fullCommand, immediateSubmit: false })}
                    className="py-2.5"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="font-medium text-sm">
                          {command.fullCommand}
                        </span>
                        {command.argumentHints &&
                          command.argumentHints.length > 0 && (
                            <span className="text-muted-foreground text-2xs mb-0.5">
                              {command.argumentHints
                                .map((arg) => `[${arg}]`)
                                .join(" ")}
                            </span>
                          )}
                        <span className="text-muted-foreground text-xs">
                          {command.description}
                        </span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onCommandSelect({ command: command.fullCommand, immediateSubmit: true });
                        }}
                        className="flex-shrink-0 p-1.5 rounded hover:bg-accent transition-colors"
                        title="Add command and submit"
                      >
                        <CornerDownLeft size={14} className="text-muted-foreground" />
                      </button>
                    </div>
                  </PromptInputCommandItem>
                ))}
              </PromptInputCommandGroup>
            )}
          </PromptInputCommandList>
        </PromptInputCommand>
      </PopoverContent>
    </Popover>
  );
};
