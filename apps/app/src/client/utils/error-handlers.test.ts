import { describe, it, expect, vi, beforeEach } from 'vitest';
import { extractErrorMessage, handleMutationError } from './error-handlers';
import { toast } from 'sonner';

// Mock sonner
vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
  },
}));

describe('extractErrorMessage', () => {
  it('should extract message from Error instance', () => {
    const error = new Error('Test error message');
    expect(extractErrorMessage(error)).toBe('Test error message');
  });

  it('should return string errors directly', () => {
    expect(extractErrorMessage('String error')).toBe('String error');
  });

  it('should extract message from API error with data.error', () => {
    const error = {
      data: {
        error: 'API error message',
      },
    };
    expect(extractErrorMessage(error)).toBe('API error message');
  });

  it('should extract message from API error with data.message', () => {
    const error = {
      data: {
        message: 'API message',
      },
    };
    expect(extractErrorMessage(error)).toBe('API message');
  });

  it('should extract message from object with error property', () => {
    const error = {
      error: 'Direct error property',
    };
    expect(extractErrorMessage(error)).toBe('Direct error property');
  });

  it('should extract message from object with message property', () => {
    const error = {
      message: 'Direct message property',
    };
    expect(extractErrorMessage(error)).toBe('Direct message property');
  });

  it('should return fallback for unknown error types', () => {
    expect(extractErrorMessage(null)).toBe('An unexpected error occurred');
    expect(extractErrorMessage(undefined)).toBe('An unexpected error occurred');
    expect(extractErrorMessage(123)).toBe('An unexpected error occurred');
    expect(extractErrorMessage({})).toBe('An unexpected error occurred');
  });

  it('should use custom fallback message', () => {
    expect(extractErrorMessage(null, 'Custom fallback')).toBe('Custom fallback');
  });

  it('should prioritize data.error over data.message', () => {
    const error = {
      data: {
        error: 'Data error',
        message: 'Data message',
      },
    };
    expect(extractErrorMessage(error)).toBe('Data error');
  });

  it('should prioritize direct error over message property', () => {
    const error = {
      error: 'Error property',
      message: 'Message property',
    };
    expect(extractErrorMessage(error)).toBe('Error property');
  });
});

describe('handleMutationError', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call toast.error with extracted error message', () => {
    const error = new Error('Mutation failed');
    handleMutationError(error);

    expect(toast.error).toHaveBeenCalledWith('Mutation failed');
    expect(toast.error).toHaveBeenCalledTimes(1);
  });

  it('should use fallback message for unknown errors', () => {
    handleMutationError(null);

    expect(toast.error).toHaveBeenCalledWith('Operation failed');
  });

  it('should use custom fallback message', () => {
    handleMutationError(null, 'Custom operation failed');

    expect(toast.error).toHaveBeenCalledWith('Custom operation failed');
  });

  it('should handle API errors with nested data', () => {
    const error = {
      data: {
        error: 'API validation error',
      },
    };
    handleMutationError(error);

    expect(toast.error).toHaveBeenCalledWith('API validation error');
  });
});
