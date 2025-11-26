import type { FileTreeItem } from '@/shared/types/file.types';

// File item interface for flattened file tree
export interface FileItem {
  filename: string;
  directory: string;
  fullPath: string;
  extension: string;
}

// File type information for badge display
export interface FileTypeInfo {
  label: string;
  color: string;
}

/**
 * Recursively flattens a file tree structure into a flat array of FileItem objects
 * @param tree Array of FileTreeItem objects to flatten
 * @returns Flat array of FileItem objects
 */
export function flattenFileTree(tree: FileTreeItem[]): FileItem[] {
  const result: FileItem[] = [];

  function traverse(items: FileTreeItem[]): void {
    for (const item of items) {
      if (item.type === 'file') {
        const pathParts = item.path.split('/');
        const filename = pathParts[pathParts.length - 1];
        const directory = pathParts.slice(0, -1).join('/') || '/';
        const extensionMatch = filename.match(/\.([a-z0-9]+)$/i);
        const extension = extensionMatch ? extensionMatch[1].toLowerCase() : '';

        result.push({
          filename,
          directory,
          fullPath: item.path,
          extension,
        });
      }

      if (item.children && item.children.length > 0) {
        traverse(item.children);
      }
    }
  }

  traverse(tree);
  return result;
}

/**
 * Extracts file path references from text content using regex pattern
 * @param text Text content to parse for file references
 * @returns Array of unique file paths found in the text
 */
export function extractFileReferences(text: string): string[] {
  if (!text) return [];

  // Match file paths: alphanumeric, /, ., -, _ followed by file extension
  const regex = /[a-zA-Z0-9/.\-_]+\.[a-z]{2,4}/g;
  const matches = text.match(regex);

  if (!matches) return [];

  // Return unique paths only
  return Array.from(new Set(matches));
}

/**
 * Inserts a string at a specific cursor position in text
 * @param text Current text content
 * @param insertion String to insert
 * @param cursorPosition Position to insert at
 * @returns Object with new text and new cursor position
 */
export function insertAtCursor(
  text: string,
  insertion: string,
  cursorPosition: number
): { text: string; cursorPosition: number } {
  const before = text.slice(0, cursorPosition);
  const after = text.slice(cursorPosition);
  const newText = before + insertion + after;
  const newCursorPosition = cursorPosition + insertion.length;

  return {
    text: newText,
    cursorPosition: newCursorPosition,
  };
}

/**
 * Removes all occurrences of a file path from text
 * @param text Current text content
 * @param pathToRemove File path to remove
 * @returns Modified text with all occurrences removed
 */
export function removeAllOccurrences(text: string, pathToRemove: string): string {
  // Escape special regex characters in the path
  const escapedPath = pathToRemove.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // Match the path with optional word boundaries (handles paths that start with ./ or ../)
  // Use negative lookahead to avoid matching if followed by more path characters
  const regex = new RegExp(`${escapedPath}(?![/\\w.-])`, 'g');
  return text.replace(regex, '');
}

/**
 * Gets file type information (label and color) based on extension
 * @param extension File extension (without dot)
 * @returns FileTypeInfo object with label and color
 */
export function getFileTypeInfo(extension: string): FileTypeInfo {
  const ext = extension.toLowerCase();

  switch (ext) {
    // TypeScript
    case 'ts':
    case 'tsx':
      return { label: 'TS', color: '#3b82f6' }; // blue-500

    // JavaScript
    case 'js':
    case 'jsx':
    case 'mjs':
    case 'cjs':
      return { label: 'JS', color: '#eab308' }; // yellow-500

    // Data formats
    case 'json':
    case 'jsonc':
      return { label: 'JSON', color: '#6b7280' }; // gray-500
    case 'yaml':
    case 'yml':
      return { label: 'YAML', color: '#ef4444' }; // red-500
    case 'xml':
      return { label: 'XML', color: '#f97316' }; // orange-500
    case 'csv':
      return { label: 'CSV', color: '#10b981' }; // emerald-500
    case 'toml':
      return { label: 'TOML', color: '#8b5cf6' }; // violet-500

    // Markup & Documentation
    case 'md':
    case 'mdx':
      return { label: 'MD', color: '#22c55e' }; // green-500
    case 'html':
    case 'htm':
      return { label: 'HTML', color: '#f97316' }; // orange-500

    // Styles
    case 'css':
      return { label: 'CSS', color: '#06b6d4' }; // cyan-500
    case 'scss':
    case 'sass':
      return { label: 'SASS', color: '#ec4899' }; // pink-500
    case 'less':
      return { label: 'LESS', color: '#6366f1' }; // indigo-500

    // Programming Languages
    case 'py':
      return { label: 'PY', color: '#3b82f6' }; // blue-500
    case 'rb':
      return { label: 'RUBY', color: '#ef4444' }; // red-500
    case 'go':
      return { label: 'GO', color: '#06b6d4' }; // cyan-500
    case 'rs':
      return { label: 'RUST', color: '#f97316' }; // orange-500
    case 'java':
      return { label: 'JAVA', color: '#ef4444' }; // red-500
    case 'php':
      return { label: 'PHP', color: '#8b5cf6' }; // violet-500
    case 'c':
      return { label: 'C', color: '#6b7280' }; // gray-500
    case 'cpp':
    case 'cc':
    case 'cxx':
      return { label: 'C++', color: '#6366f1' }; // indigo-500
    case 'cs':
      return { label: 'C#', color: '#8b5cf6' }; // violet-500
    case 'swift':
      return { label: 'SWIFT', color: '#f97316' }; // orange-500
    case 'kt':
    case 'kts':
      return { label: 'KT', color: '#8b5cf6' }; // violet-500

    // Shell & Config
    case 'sh':
    case 'bash':
    case 'zsh':
      return { label: 'SHELL', color: '#22c55e' }; // green-500
    case 'env':
      return { label: 'ENV', color: '#eab308' }; // yellow-500
    case 'ini':
    case 'conf':
      return { label: 'CONF', color: '#6b7280' }; // gray-500

    // Images
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'gif':
    case 'webp':
      return { label: 'IMG', color: '#8b5cf6' }; // violet-500
    case 'svg':
      return { label: 'SVG', color: '#ec4899' }; // pink-500
    case 'ico':
      return { label: 'ICO', color: '#a855f7' }; // purple-500

    // Documents
    case 'pdf':
      return { label: 'PDF', color: '#ef4444' }; // red-500
    case 'doc':
    case 'docx':
      return { label: 'DOC', color: '#3b82f6' }; // blue-500
    case 'xls':
    case 'xlsx':
      return { label: 'XLS', color: '#10b981' }; // emerald-500
    case 'ppt':
    case 'pptx':
      return { label: 'PPT', color: '#f97316' }; // orange-500

    // Text
    case 'txt':
      return { label: 'TXT', color: '#6b7280' }; // gray-500
    case 'log':
      return { label: 'LOG', color: '#64748b' }; // slate-500

    // Archives
    case 'zip':
    case 'tar':
    case 'gz':
    case 'rar':
    case '7z':
      return { label: 'ZIP', color: '#a855f7' }; // purple-500

    // Misc
    case 'sql':
      return { label: 'SQL', color: '#f59e0b' }; // amber-500
    case 'graphql':
    case 'gql':
      return { label: 'GQL', color: '#ec4899' }; // pink-500

    default:
      return { label: 'FILE', color: '#9ca3af' }; // gray-400
  }
}
