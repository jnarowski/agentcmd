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
import { AtSignIcon, CheckIcon } from "lucide-react";
import { useEffect, useRef, useState, useMemo } from "react";
import { useProjectFiles } from "@/client/pages/projects/files/hooks/useFiles";
import Fuse from "fuse.js";
import {
  flattenFileTree,
  extractFileReferences,
  type FileItem,
} from "@/client/pages/projects/files/utils/fileUtils";
import { FileBadge } from "@/client/components/ui/file-badge";

interface ChatPromptInputFilesProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  projectPath: string;
  onFileSelect: (filePath: string) => void;
  onFileRemove: (filePath: string) => void;
  textareaValue: string;
}

// Helper to convert absolute path to relative path with @ prefix
const toRelativePath = (absolutePath: string, projectPath: string): string => {
  if (!projectPath) return absolutePath;

  // Ensure project path ends without a trailing slash
  const normalizedProjectPath = projectPath.endsWith("/")
    ? projectPath.slice(0, -1)
    : projectPath;

  // If the path starts with the project path, make it relative
  if (absolutePath.startsWith(normalizedProjectPath + "/")) {
    const relativePath = absolutePath.slice(normalizedProjectPath.length + 1);
    return `@${relativePath}`;
  }

  return absolutePath;
};

// Helper to get relative directory path for display
const getRelativeDirectory = (
  fullPath: string,
  projectPath: string
): string => {
  if (!projectPath) return fullPath;

  // Ensure project path ends without a trailing slash
  const normalizedProjectPath = projectPath.endsWith("/")
    ? projectPath.slice(0, -1)
    : projectPath;

  // If the path starts with the project path, make it relative
  if (fullPath.startsWith(normalizedProjectPath + "/")) {
    const relativePath = fullPath.slice(normalizedProjectPath.length + 1);
    // Get directory portion (everything before the last /)
    const lastSlashIndex = relativePath.lastIndexOf("/");
    return lastSlashIndex > -1 ? relativePath.slice(0, lastSlashIndex) : "";
  }

  return fullPath;
};

export const ChatPromptInputFiles = ({
  open,
  onOpenChange,
  projectId,
  projectPath,
  onFileSelect,
  onFileRemove,
  textareaValue,
}: ChatPromptInputFilesProps) => {
  const commandInputRef = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [addedFiles, setAddedFiles] = useState<string[]>([]);

  // Fetch project files
  const { data, isLoading, error } = useProjectFiles(projectId);

  // Flatten file tree
  const flattenedFiles = useMemo(() => {
    return flattenFileTree(data || []);
  }, [data]);

  // Setup Fuse.js search
  const fuse = useMemo(() => {
    return new Fuse(flattenedFiles, {
      keys: [
        { name: "filename", weight: 0.7 },
        { name: "fullPath", weight: 0.3 },
      ],
      threshold: 0.4,
      includeScore: true,
    });
  }, [flattenedFiles]);

  // Parse added files when menu opens
  useEffect(() => {
    if (open) {
      const references = extractFileReferences(textareaValue);
      setAddedFiles(references);
    }
  }, [open, textareaValue]);

  // Filter files based on search query
  const filteredFiles = useMemo(() => {
    if (!searchQuery) {
      return flattenedFiles;
    }
    const results = fuse.search(searchQuery);
    return results.map((result) => result.item);
  }, [searchQuery, fuse, flattenedFiles]);

  // Focus command input when menu opens
  useEffect(() => {
    if (open && commandInputRef.current) {
      // Small delay to ensure the popover is rendered
      setTimeout(() => {
        commandInputRef.current?.focus();
      }, 0);
    }
  }, [open]);

  // Get file items for added files
  const addedFileItems = useMemo(() => {
    return addedFiles
      .map((path) => flattenedFiles.find((f) => f.fullPath === path))
      .filter((f): f is FileItem => f !== undefined);
  }, [addedFiles, flattenedFiles]);

  // Filter out already added files from search results
  // Only limit results when NOT searching to keep initial load fast
  const searchResults = useMemo(() => {
    const filtered = filteredFiles.filter((file) => !addedFiles.includes(file.fullPath));
    // If user is searching, show all results; otherwise limit to 100 for fast initial render
    return searchQuery ? filtered : filtered.slice(0, 100);
  }, [filteredFiles, addedFiles, searchQuery]);

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <PromptInputButton>
          <AtSignIcon size={16} />
        </PromptInputButton>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[calc(100vw-2rem)] md:w-[400px] p-0">
        <PromptInputCommand>
          <PromptInputCommandInput
            ref={commandInputRef}
            className="border-none focus-visible:ring-0"
            placeholder="Search files..."
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <PromptInputCommandList>
            {isLoading && (
              <div className="p-3 text-muted-foreground text-sm">
                Loading files...
              </div>
            )}
            {error && (
              <div className="p-3 text-destructive text-sm">
                Error loading files: {error.message}
              </div>
            )}
            {!isLoading && !error && flattenedFiles.length === 0 && (
              <PromptInputCommandEmpty className="p-3 text-muted-foreground text-sm">
                No files found in project.
              </PromptInputCommandEmpty>
            )}
            {!isLoading &&
              !error &&
              flattenedFiles.length > 0 &&
              searchResults.length === 0 &&
              addedFileItems.length === 0 && (
                <PromptInputCommandEmpty className="p-3 text-muted-foreground text-sm">
                  No results found.
                </PromptInputCommandEmpty>
              )}

            {/* Added Files Section */}
            {addedFileItems.length > 0 && (
              <PromptInputCommandGroup heading="Added Files">
                {addedFileItems.map((file) => (
                  <PromptInputCommandItem
                    key={file.fullPath}
                    onSelect={() => onFileRemove(file.fullPath)}
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <FileBadge extension={file.extension} />
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="font-medium text-sm truncate">
                          {file.filename}
                        </span>
                        <span className="text-muted-foreground text-xs truncate">
                          {getRelativeDirectory(file.fullPath, projectPath)}
                        </span>
                      </div>
                    </div>
                    <CheckIcon className="h-4 w-4 ml-2 flex-shrink-0" />
                  </PromptInputCommandItem>
                ))}
              </PromptInputCommandGroup>
            )}

            {/* Separator between added files and search results */}
            {addedFileItems.length > 0 && searchResults.length > 0 && (
              <PromptInputCommandSeparator />
            )}

            {/* Search Results Section */}
            {searchResults.length > 0 && (
              <PromptInputCommandGroup heading="Search Results">
                {searchResults.map((file) => (
                  <PromptInputCommandItem
                    key={file.fullPath}
                    onSelect={() =>
                      onFileSelect(toRelativePath(file.fullPath, projectPath))
                    }
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <FileBadge extension={file.extension} />
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="font-medium text-sm truncate">
                          {file.filename}
                        </span>
                        <span className="text-muted-foreground text-xs truncate">
                          {getRelativeDirectory(file.fullPath, projectPath)}
                        </span>
                      </div>
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
