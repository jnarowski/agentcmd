"use client";

import { useState, useMemo } from "react";
import { ChevronsUpDownIcon } from "lucide-react";
import { Combobox, type ComboboxOption } from "@/client/components/ui/combobox";
import { FileItem } from "@/client/components/FileItem";
import { useProjectFiles } from "@/client/pages/projects/files/hooks/useFiles";
import { flattenFileTree, type FileItem as FileItemType } from "@/client/pages/projects/files/utils/fileUtils";
import { useFileSearch } from "@/client/hooks/useFileSearch";

// Extend ComboboxOption to include FileItem data
interface FileComboboxOption extends ComboboxOption {
  _fileItem: FileItemType;
}

export interface FileSelectComboboxProps {
  /** Currently selected file path (absolute) */
  value?: string;
  /** Callback when file is selected (returns absolute path) */
  onValueChange: (value: string) => void;
  /** Project ID for fetching files */
  projectId: string;
  /** Project path for relative path conversion */
  projectPath: string;
  /** Optional extension filter (e.g., ['.ts', '.tsx']) */
  extensionFilter?: string | string[];
  /** Placeholder text for trigger button */
  placeholder?: string;
  /** Search input placeholder */
  searchPlaceholder?: string;
  /** Disabled state */
  disabled?: boolean;
  /** Additional class names for button */
  buttonClassName?: string;
}

// Path conversion helpers

/** Convert absolute path to relative path (without @ prefix) */
function toRelativePath(absolutePath: string, projectPath: string): string {
  if (!projectPath || !absolutePath) return absolutePath;

  // Normalize project path (remove trailing slash)
  const normalizedProjectPath = projectPath.endsWith("/")
    ? projectPath.slice(0, -1)
    : projectPath;

  // If the path starts with the project path, make it relative
  if (absolutePath.startsWith(normalizedProjectPath + "/")) {
    return absolutePath.slice(normalizedProjectPath.length + 1);
  }

  return absolutePath;
}

/** Get relative directory path for display */
function getRelativeDirectory(fullPath: string, projectPath: string): string {
  if (!projectPath || !fullPath) return fullPath;

  // Normalize project path (remove trailing slash)
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
}

/**
 * Reusable file selector combobox with search and filtering
 *
 * Integrates useProjectFiles, useFileSearch, and Combobox to provide a
 * searchable file selector with intelligent scoring and custom rendering.
 *
 * @example Basic usage (all files)
 * ```tsx
 * <FileSelectCombobox
 *   value={dockerFilePath}
 *   onValueChange={setDockerFilePath}
 *   projectId={project.id}
 *   projectPath={project.path}
 * />
 * ```
 *
 * @example With extension filter
 * ```tsx
 * <FileSelectCombobox
 *   value={configPath}
 *   onValueChange={setConfigPath}
 *   projectId={project.id}
 *   projectPath={project.path}
 *   extensionFilter={['.yml', '.yaml', '.json']}
 * />
 * ```
 */
export function FileSelectCombobox({
  value,
  onValueChange,
  projectId,
  projectPath,
  extensionFilter,
  placeholder = "Select file...",
  searchPlaceholder = "Search files...",
  disabled = false,
  buttonClassName = "",
}: FileSelectComboboxProps) {
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch project files
  const { data, isLoading, error } = useProjectFiles(projectId);

  // Flatten file tree
  const flattenedFiles = useMemo(() => {
    return flattenFileTree(data || []);
  }, [data]);

  // Search with debouncing and optional extension filtering
  const { results: searchResults } = useFileSearch(searchQuery, flattenedFiles, {
    maxResults: 50,
    extensionFilter,
  });

  // Transform FileItem[] → ComboboxOption[] (absolute paths as values)
  const options: FileComboboxOption[] = useMemo(() => {
    return searchResults.map((file) => ({
      value: file.fullPath,
      label: file.filename,
      description: getRelativeDirectory(file.fullPath, projectPath),
      _fileItem: file,
    }));
  }, [searchResults, projectPath]);

  // Handle loading/error states
  if (isLoading) {
    return (
      <div className="text-sm text-muted-foreground">Loading files...</div>
    );
  }

  if (error) {
    return (
      <div className="text-sm text-destructive">
        Error loading files: {error.message}
      </div>
    );
  }

  if (flattenedFiles.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">No files found in project.</div>
    );
  }

  return (
    <Combobox
      value={value}
      onValueChange={onValueChange}
      options={options}
      placeholder={placeholder}
      searchPlaceholder={searchPlaceholder}
      emptyMessage="No files found"
      disabled={disabled}
      buttonClassName={buttonClassName}
      useMobileDrawer={true}
      onSearchChange={setSearchQuery}
      // Custom trigger rendering (show selected file with FileItem)
      renderTrigger={(selectedOption, open) => {
        if (!selectedOption) {
          return (
            <>
              {placeholder}
              <ChevronsUpDownIcon className="ml-2 size-4 shrink-0 opacity-50" />
            </>
          );
        }

        const fileOption = selectedOption as FileComboboxOption;
        const relativePath = toRelativePath(fileOption.value, projectPath);

        return (
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <FileItem
              filename={fileOption._fileItem.filename}
              extension={fileOption._fileItem.extension}
              directory={getRelativeDirectory(fileOption.value, projectPath)}
            />
            <ChevronsUpDownIcon className="ml-auto size-4 shrink-0 opacity-50" />
          </div>
        );
      }}
      // Custom option rendering (use FileItem component)
      renderOption={(option, selected) => {
        const fileOption = option as FileComboboxOption;
        return (
          <FileItem
            filename={fileOption._fileItem.filename}
            extension={fileOption._fileItem.extension}
            directory={getRelativeDirectory(fileOption.value, projectPath)}
          />
        );
      }}
    />
  );
}
