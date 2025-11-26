import { useState, useMemo } from "react";
import { Folder, Search } from "lucide-react";
import { useProjectFiles } from "@/client/pages/projects/files/hooks/useFiles";
import { useActiveProject } from "@/client/hooks/navigation";
import { useFilesStore } from "@/client/stores/index";
import type { FileTreeItem } from "@/shared/types/file.types";
import { Button } from "@/client/components/ui/button";
import { Skeleton } from "@/client/components/ui/skeleton";
import { Alert, AlertDescription } from "@/client/components/ui/alert";
import { FileEditor } from "../FileEditor";
import { ImageViewer } from "../ImageViewer";
import { FileTreeSearch } from "./FileTreeSearch";
import { FileTreeItem as FileTreeItemComponent } from "./FileTreeItem";
import { useFileTreeExpansion } from "../../hooks/useFileTreeExpansion";

// Helper function to filter files based on search query
function filterFiles(items: FileTreeItem[], query: string): FileTreeItem[] {
  if (!query) return items;

  const lowerQuery = query.toLowerCase();
  const filtered: FileTreeItem[] = [];

  for (const item of items) {
    if (item.name.toLowerCase().includes(lowerQuery)) {
      // Item matches - include it
      filtered.push(item);
    } else if (item.type === "directory" && item.children) {
      // Check if any children match
      const filteredChildren = filterFiles(item.children, query);
      if (filteredChildren.length > 0) {
        // Include directory with filtered children
        filtered.push({
          ...item,
          children: filteredChildren,
        });
      }
    }
  }

  return filtered;
}

// Helper function to check if file is an image
function isImageFile(filename: string): boolean {
  const ext = filename.split(".").pop()?.toLowerCase();
  const imageExts = ["png", "jpg", "jpeg", "gif", "svg", "webp", "ico", "bmp"];
  return imageExts.includes(ext || "");
}

export function FileTree() {
  const { projectId } = useActiveProject();
  const { data: files, isLoading, error } = useProjectFiles(projectId!);

  // Use filesStore for UI state
  const expandedDirs = useFilesStore((s) => s.expandedDirs);
  const toggleDir = useFilesStore((s) => s.toggleDir);
  const expandMultipleDirs = useFilesStore((s) => s.expandMultipleDirs);
  const searchQuery = useFilesStore((s) => s.searchQuery);
  const setSearch = useFilesStore((s) => s.setSearch);
  const setSelectedFile = useFilesStore((s) => s.setSelectedFile);
  const clearSelection = useFilesStore((s) => s.clearSelection);

  const [selectedFileItem, setSelectedFileItem] = useState<FileTreeItem | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);

  // Auto-expand directories containing search matches
  useFileTreeExpansion({
    searchQuery,
    files,
    expandMultipleDirs,
  });

  const filteredFiles = useMemo(() => {
    if (!files) return [];
    return filterFiles(files, searchQuery);
  }, [files, searchQuery]);

  const handleToggle = (path: string) => {
    toggleDir(path);
  };

  const handleFileClick = (item: FileTreeItem) => {
    setSelectedFileItem(item);
    setSelectedFile(item.path);
    if (isImageFile(item.name)) {
      setIsImageViewerOpen(true);
    } else {
      setIsEditorOpen(true);
    }
  };

  const handleCloseEditor = () => {
    setIsEditorOpen(false);
    setSelectedFileItem(null);
    clearSelection();
  };

  const handleCloseImageViewer = () => {
    setIsImageViewerOpen(false);
    setSelectedFileItem(null);
    clearSelection();
  };

  const handleClearSearch = () => {
    setSearch("");
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col h-full p-4 space-y-2">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-5/6" />
        <Skeleton className="h-8 w-full" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="p-4">
        <Alert variant="destructive">
          <AlertDescription>
            {error.message || "Failed to load files. Please try again."}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Empty state
  if (!files || files.length === 0) {
    return (
      <div className="flex items-center justify-center h-full p-4">
        <div className="text-center text-muted-foreground">
          <Folder className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>No files found in this project.</p>
        </div>
      </div>
    );
  }

  // No search results
  if (searchQuery && filteredFiles.length === 0) {
    return (
      <div className="flex flex-col h-full">
        <FileTreeSearch
          searchQuery={searchQuery}
          onSearchChange={setSearch}
          onClearSearch={handleClearSearch}
        />
        <div className="flex items-center justify-center flex-1 p-4">
          <div className="text-center text-muted-foreground">
            <Search className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No files match "{searchQuery}"</p>
            <Button variant="link" onClick={handleClearSearch} className="mt-2">
              Clear search
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col h-full">
        <FileTreeSearch
          searchQuery={searchQuery}
          onSearchChange={setSearch}
          onClearSearch={handleClearSearch}
        />
        <div className="flex-1 overflow-auto p-2">
          {filteredFiles.map((item) => (
            <FileTreeItemComponent
              key={item.path}
              item={item}
              level={0}
              expandedDirs={expandedDirs}
              onToggle={handleToggle}
              onFileClick={handleFileClick}
            />
          ))}
        </div>
      </div>

      {/* File Editor Modal */}
      {isEditorOpen && selectedFileItem && (
        <FileEditor
          projectId={projectId!}
          filePath={selectedFileItem.path}
          fileName={selectedFileItem.name}
          onClose={handleCloseEditor}
        />
      )}

      {/* Image Viewer Modal */}
      {isImageViewerOpen && selectedFileItem && (
        <ImageViewer
          projectId={projectId!}
          filePath={selectedFileItem.path}
          fileName={selectedFileItem.name}
          onClose={handleCloseImageViewer}
        />
      )}
    </>
  );
}
