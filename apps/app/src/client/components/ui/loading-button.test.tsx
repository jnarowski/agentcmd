import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { LoadingButton } from './loading-button';

describe('LoadingButton', () => {
  afterEach(() => {
    cleanup();
  });

  it('should render children when not loading', () => {
    render(<LoadingButton>Click me</LoadingButton>);

    expect(screen.getByRole('button')).toHaveTextContent('Click me');
  });

  it('should show spinner when loading', () => {
    render(<LoadingButton isLoading>Click me</LoadingButton>);

    const button = screen.getByRole('button');
    const spinner = button.querySelector('svg.animate-spin');

    expect(spinner).toBeInTheDocument();
  });

  it('should show loadingText when provided and loading', () => {
    render(
      <LoadingButton isLoading loadingText="Loading...">
        Click me
      </LoadingButton>
    );

    expect(screen.getByRole('button')).toHaveTextContent('Loading...');
  });

  it('should show children when loading but no loadingText', () => {
    render(<LoadingButton isLoading>Click me</LoadingButton>);

    expect(screen.getByRole('button')).toHaveTextContent('Click me');
  });

  it('should be disabled when loading', () => {
    render(<LoadingButton isLoading>Click me</LoadingButton>);

    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('should be disabled when disabled prop is true', () => {
    render(<LoadingButton disabled>Click me</LoadingButton>);

    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('should be disabled when both isLoading and disabled are true', () => {
    render(
      <LoadingButton isLoading disabled>
        Click me
      </LoadingButton>
    );

    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('should not be disabled when not loading and not disabled', () => {
    render(<LoadingButton>Click me</LoadingButton>);

    expect(screen.getByRole('button')).not.toBeDisabled();
  });

  it('should forward button props', () => {
    const handleClick = vi.fn();
    render(
      <LoadingButton onClick={handleClick} type="submit" aria-label="Submit">
        Submit
      </LoadingButton>
    );

    const button = screen.getByRole('button');

    expect(button).toHaveAttribute('type', 'submit');
    expect(button).toHaveAttribute('aria-label', 'Submit');
  });

  it('should support button variants', () => {
    render(<LoadingButton variant="destructive">Delete</LoadingButton>);

    // Button should render without errors
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('should support button sizes', () => {
    render(<LoadingButton size="lg">Large Button</LoadingButton>);

    // Button should render without errors
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('should handle className prop', () => {
    render(<LoadingButton className="custom-class">Click me</LoadingButton>);

    expect(screen.getByRole('button')).toHaveClass('custom-class');
  });
});
