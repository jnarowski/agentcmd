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
    case 'ts':
    case 'tsx':
      return { label: 'TS', color: 'rgb(59, 130, 246)' }; // blue
    case 'js':
    case 'jsx':
      return { label: 'JS', color: 'rgb(234, 179, 8)' }; // yellow
    case 'json':
      return { label: 'JSON', color: 'rgb(107, 114, 128)' }; // gray
    case 'md':
      return { label: 'MD', color: 'rgb(34, 197, 94)' }; // green
    default:
      return { label: 'FILE', color: 'rgb(156, 163, 175)' }; // light gray
  }
}
