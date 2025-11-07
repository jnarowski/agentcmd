// File tree types for project file browser

export interface FileTreeItem {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number; // File size in bytes (only for files)
  modified?: Date; // Last modified date
  permissions?: string; // Permissions string (e.g., "rw-r--r--")
  children?: FileTreeItem[]; // Child items for directories
}

export interface FilesResponse {
  data: FileTreeItem[];
}

export interface FileErrorResponse {
  error: string;
  message?: string;
}
