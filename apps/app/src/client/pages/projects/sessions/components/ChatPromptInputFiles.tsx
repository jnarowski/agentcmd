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
import {
  flattenFileTree,
  extractFileReferences,
  type FileItem as FileItemType,
} from "@/client/pages/projects/files/utils/fileUtils";
import { FileItem } from "@/client/components/FileItem";
import { useFileSearch } from "@/client/hooks/useFileSearch";

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

  // Parse added files when menu opens
  useEffect(() => {
    if (open) {
      const references = extractFileReferences(textareaValue);
      setAddedFiles(references);
    }
  }, [open, textareaValue]);

  // Search files with debouncing
  const { results: filteredFiles } = useFileSearch(searchQuery, flattenedFiles, {
    maxResults: 50,
  });

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
      .filter((f): f is FileItemType => f !== undefined);
  }, [addedFiles, flattenedFiles]);

  // Filter out already added files from search results
  // Always cap at 50 for performance (search all, render few)
  const searchResults = useMemo(() => {
    const filtered = filteredFiles.filter((file) => !addedFiles.includes(file.fullPath));
    return filtered.slice(0, 50);
  }, [filteredFiles, addedFiles]);

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <PromptInputButton size="icon-responsive">
          <AtSignIcon size={20} className="md:size-4" />
        </PromptInputButton>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[calc(100vw-2rem)] md:w-[400px] p-0">
        <PromptInputCommand shouldFilter={false}>
          <PromptInputCommandInput
            ref={commandInputRef}
            className="border-none focus-visible:ring-0"
            placeholder="Search files..."
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <PromptInputCommandList className="h-[300px]">
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
                    <FileItem
                      filename={file.filename}
                      extension={file.extension}
                      directory={getRelativeDirectory(file.fullPath, projectPath)}
                    />
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
                    <FileItem
                      filename={file.filename}
                      extension={file.extension}
                      directory={getRelativeDirectory(file.fullPath, projectPath)}
                    />
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
