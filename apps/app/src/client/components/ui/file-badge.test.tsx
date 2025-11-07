import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import React from 'react';
import { FileBadge } from './file-badge';

describe('FileBadge', () => {
  afterEach(() => {
    cleanup();
  });

  it('should render correct label for TypeScript files', () => {
    render(<FileBadge extension="ts" />);
    const element = screen.getByText('TS');
    expect(element).toBeDefined();
  });

  it('should render correct label for TSX files', () => {
    render(<FileBadge extension="tsx" />);
    const element = screen.getByText('TS');
    expect(element).toBeDefined();
  });

  it('should render correct label for JavaScript files', () => {
    render(<FileBadge extension="js" />);
    const element = screen.getByText('JS');
    expect(element).toBeDefined();
  });

  it('should render correct label for JSX files', () => {
    render(<FileBadge extension="jsx" />);
    const element = screen.getByText('JS');
    expect(element).toBeDefined();
  });

  it('should render correct label for JSON files', () => {
    render(<FileBadge extension="json" />);
    const element = screen.getByText('JSON');
    expect(element).toBeDefined();
  });

  it('should render correct label for Markdown files', () => {
    render(<FileBadge extension="md" />);
    const element = screen.getByText('MD');
    expect(element).toBeDefined();
  });

  it('should handle unknown extension', () => {
    render(<FileBadge extension="xyz" />);
    const element = screen.getByText('FILE');
    expect(element).toBeDefined();
  });

  it('should apply correct color for TypeScript files', () => {
    const { container } = render(<FileBadge extension="ts" />);
    const badge = container.querySelector('span');
    expect(badge?.style.color).toBe('rgb(59, 130, 246)');
  });

  it('should apply correct color for JavaScript files', () => {
    const { container } = render(<FileBadge extension="js" />);
    const badge = container.querySelector('span');
    expect(badge?.style.color).toBe('rgb(234, 179, 8)');
  });

  it('should apply correct color for JSON files', () => {
    const { container } = render(<FileBadge extension="json" />);
    const badge = container.querySelector('span');
    expect(badge?.style.color).toBe('rgb(107, 114, 128)');
  });

  it('should have consistent width for all types', () => {
    const { container: container1 } = render(<FileBadge extension="ts" />);
    const badge1 = container1.querySelector('span');
    expect(badge1?.className).toContain('w-12');
    cleanup();

    const { container: container2 } = render(<FileBadge extension="json" />);
    const badge2 = container2.querySelector('span');
    expect(badge2?.className).toContain('w-12');
  });
});
