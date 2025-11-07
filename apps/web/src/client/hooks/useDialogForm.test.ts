import { describe, it, expect, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useDialogForm } from './useDialogForm';

interface TestFormValues {
  name: string;
  email: string;
}

describe('useDialogForm', () => {
  const initialValues: TestFormValues = {
    name: '',
    email: '',
  };

  it('should initialize with initial values', () => {
    const onSubmit = vi.fn();
    const { result } = renderHook(() =>
      useDialogForm({ initialValues, onSubmit })
    );

    expect(result.current.values).toEqual(initialValues);
    expect(result.current.error).toBeNull();
    expect(result.current.isSubmitting).toBe(false);
  });

  it('should update values when setValues is called', () => {
    const onSubmit = vi.fn();
    const { result } = renderHook(() =>
      useDialogForm({ initialValues, onSubmit })
    );

    const newValues: TestFormValues = { name: 'John', email: 'john@example.com' };

    act(() => {
      result.current.setValues(newValues);
    });

    expect(result.current.values).toEqual(newValues);
  });

  it('should handle successful form submission', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useDialogForm({ initialValues, onSubmit })
    );

    const newValues: TestFormValues = { name: 'John', email: 'john@example.com' };

    act(() => {
      result.current.setValues(newValues);
    });

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(onSubmit).toHaveBeenCalledWith(newValues);
    expect(result.current.error).toBeNull();
    expect(result.current.isSubmitting).toBe(false);
  });

  it('should set isSubmitting to true during submission', async () => {
    const onSubmit = vi.fn(
      () => new Promise((resolve) => setTimeout(resolve, 100))
    );
    const { result } = renderHook(() =>
      useDialogForm({ initialValues, onSubmit })
    );

    act(() => {
      result.current.handleSubmit();
    });

    expect(result.current.isSubmitting).toBe(true);

    await waitFor(() => {
      expect(result.current.isSubmitting).toBe(false);
    });
  });

  it('should handle submission errors with Error instance', async () => {
    const errorMessage = 'Submission failed';
    const onSubmit = vi.fn().mockRejectedValue(new Error(errorMessage));
    const { result } = renderHook(() =>
      useDialogForm({ initialValues, onSubmit })
    );

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(result.current.error).toBe(errorMessage);
    expect(result.current.isSubmitting).toBe(false);
  });

  it('should handle submission errors with string', async () => {
    const errorMessage = 'String error';
    const onSubmit = vi.fn().mockRejectedValue(errorMessage);
    const { result } = renderHook(() =>
      useDialogForm({ initialValues, onSubmit })
    );

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(result.current.error).toBe(errorMessage);
    expect(result.current.isSubmitting).toBe(false);
  });

  it('should handle unknown errors', async () => {
    const onSubmit = vi.fn().mockRejectedValue({ unknown: 'error' });
    const { result } = renderHook(() =>
      useDialogForm({ initialValues, onSubmit })
    );

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(result.current.error).toBe('An error occurred');
    expect(result.current.isSubmitting).toBe(false);
  });

  it('should clear error on setError(null)', () => {
    const onSubmit = vi.fn();
    const { result } = renderHook(() =>
      useDialogForm({ initialValues, onSubmit })
    );

    act(() => {
      result.current.setError('Test error');
    });

    expect(result.current.error).toBe('Test error');

    act(() => {
      result.current.setError(null);
    });

    expect(result.current.error).toBeNull();
  });

  it('should clear error when submitting again', async () => {
    const onSubmit = vi.fn()
      .mockRejectedValueOnce(new Error('First error'))
      .mockResolvedValueOnce(undefined);

    const { result } = renderHook(() =>
      useDialogForm({ initialValues, onSubmit })
    );

    // First submission - error
    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(result.current.error).toBe('First error');

    // Second submission - success, error should be cleared
    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(result.current.error).toBeNull();
  });

  it('should reset form to initial values', () => {
    const onSubmit = vi.fn();
    const { result } = renderHook(() =>
      useDialogForm({ initialValues, onSubmit })
    );

    // Update values and error
    act(() => {
      result.current.setValues({ name: 'John', email: 'john@example.com' });
      result.current.setError('Test error');
    });

    expect(result.current.values).not.toEqual(initialValues);
    expect(result.current.error).toBe('Test error');

    // Reset
    act(() => {
      result.current.reset();
    });

    expect(result.current.values).toEqual(initialValues);
    expect(result.current.error).toBeNull();
    expect(result.current.isSubmitting).toBe(false);
  });

  it('should prevent default on form event', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useDialogForm({ initialValues, onSubmit })
    );

    const mockEvent = {
      preventDefault: vi.fn(),
    } as unknown as React.FormEvent;

    await act(async () => {
      await result.current.handleSubmit(mockEvent);
    });

    expect(mockEvent.preventDefault).toHaveBeenCalled();
  });

  it('should work without form event', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useDialogForm({ initialValues, onSubmit })
    );

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(onSubmit).toHaveBeenCalled();
  });
});
