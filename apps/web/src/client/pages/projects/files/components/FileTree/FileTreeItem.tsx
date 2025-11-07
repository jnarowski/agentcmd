import {
  Folder,
  FolderOpen,
  FileCode,
  FileText,
  File,
  FileImage,
  ChevronRight,
} from "lucide-react";
import type { FileTreeItem } from "@/shared/types/file.types";

// Helper function to get file icon based on extension
function getFileIcon(filename: string) {
  const ext = filename.split(".").pop()?.toLowerCase();
  const codeExts = [
    "ts",
    "tsx",
    "js",
    "jsx",
    "py",
    "java",
    "c",
    "cpp",
    "go",
    "rs",
    "rb",
    "php",
  ];
  const imageExts = ["png", "jpg", "jpeg", "gif", "svg", "webp", "ico"];

  if (codeExts.includes(ext || "")) {
    return <FileCode className="h-4 w-4 text-blue-500" />;
  }
  if (imageExts.includes(ext || "")) {
    return <FileImage className="h-4 w-4 text-purple-500" />;
  }
  if (["md", "txt", "json", "yaml", "yml", "xml"].includes(ext || "")) {
    return <FileText className="h-4 w-4 text-gray-500" />;
  }
  return <File className="h-4 w-4 text-gray-400" />;
}

export interface FileTreeItemProps {
  item: FileTreeItem;
  level: number;
  expandedDirs: Set<string>;
  onToggle: (path: string) => void;
  onFileClick: (item: FileTreeItem) => void;
}

/**
 * Recursive file tree item component.
 *
 * Renders a single file or directory in the tree with:
 * - Chevron icon for directories (rotates when expanded)
 * - Folder/FolderOpen icons for directories
 * - File type icons for files (code/image/text)
 * - Indentation based on nesting level
 * - Recursive rendering of children for directories
 *
 * @param props.item - File or directory item to render
 * @param props.level - Nesting level (0-based, used for indentation)
 * @param props.expandedDirs - Set of expanded directory paths
 * @param props.onToggle - Callback when directory is toggled
 * @param props.onFileClick - Callback when file is clicked
 */
export function FileTreeItem({
  item,
  level,
  expandedDirs,
  onToggle,
  onFileClick,
}: FileTreeItemProps) {
  const isExpanded = expandedDirs.has(item.path);

  if (item.type === "directory") {
    return (
      <div>
        <div
          className="flex items-center gap-2 px-2 py-1.5 hover:bg-secondary/50 cursor-pointer rounded-sm"
          style={{ paddingLeft: `${level * 16 + 8}px` }}
          onClick={() => onToggle(item.path)}
        >
          <ChevronRight
            className={`h-3 w-3 transition-transform flex-shrink-0 ${
              isExpanded ? "rotate-90" : ""
            }`}
          />
          {isExpanded ? (
            <FolderOpen className="h-4 w-4 text-blue-500 flex-shrink-0" />
          ) : (
            <Folder className="h-4 w-4 text-blue-500 flex-shrink-0" />
          )}
          <span className="text-sm font-medium">{item.name}</span>
        </div>
        {isExpanded && item.children && item.children.length > 0 && (
          <div>
            {item.children.map((child) => (
              <FileTreeItem
                key={child.path}
                item={child}
                level={level + 1}
                expandedDirs={expandedDirs}
                onToggle={onToggle}
                onFileClick={onFileClick}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  // File item
  return (
    <div
      className="flex items-center gap-2 px-2 py-1.5 hover:bg-secondary/50 cursor-pointer rounded-sm"
      style={{ paddingLeft: `${level * 16 + 24}px` }}
      onClick={() => onFileClick(item)}
    >
      {getFileIcon(item.name)}
      <span className="text-sm">{item.name}</span>
    </div>
  );
}
