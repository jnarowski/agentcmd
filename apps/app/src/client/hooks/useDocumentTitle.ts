import { useEffect } from 'react';

/**
 * Custom hook to update the document title
 * @param title - The title to set. If undefined, no update occurs.
 * @example
 * useDocumentTitle('Projects | Agent Workflows');
 * useDocumentTitle(projectName ? `${projectName} | Agent Workflows` : undefined);
 */
export function useDocumentTitle(title: string | undefined): void {
  useEffect(() => {
    if (title) {
      document.title = title;
    }
  }, [title]);
}
