import { useState, useCallback } from 'react';

export interface UseDialogFormOptions<T> {
  initialValues: T;
  onSubmit: (values: T) => Promise<void> | void;
}

export interface UseDialogFormReturn<T> {
  values: T;
  setValues: (values: T) => void;
  error: string | null;
  setError: (error: string | null) => void;
  isSubmitting: boolean;
  handleSubmit: (e?: React.FormEvent) => Promise<void>;
  reset: () => void;
}

/**
 * Hook for managing dialog form state
 * Handles form values, errors, submission state, and reset functionality
 */
export function useDialogForm<T>({
  initialValues,
  onSubmit,
}: UseDialogFormOptions<T>): UseDialogFormReturn<T> {
  const [values, setValues] = useState<T>(initialValues);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      if (e) {
        e.preventDefault();
      }

      setError(null);
      setIsSubmitting(true);

      try {
        await onSubmit(values);
      } catch (err) {
        // Extract error message
        let errorMessage = 'An error occurred';
        if (err instanceof Error) {
          errorMessage = err.message;
        } else if (typeof err === 'string') {
          errorMessage = err;
        }
        setError(errorMessage);
      } finally {
        setIsSubmitting(false);
      }
    },
    [onSubmit, values]
  );

  const reset = useCallback(() => {
    setValues(initialValues);
    setError(null);
    setIsSubmitting(false);
  }, [initialValues]);

  return {
    values,
    setValues,
    error,
    setError,
    isSubmitting,
    handleSubmit,
    reset,
  };
}
