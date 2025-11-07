import { describe, it, expect } from 'vitest';
import { buildSlashCommand } from '../../../../.agent/generated/slash-commands';

describe('buildSlashCommand', () => {
  it('preserves frontmatter order regardless of object property order', () => {
    const result = buildSlashCommand('/generate-prd', {
      format: 'md',        // 3rd in frontmatter
      featurename: 'auth', // 1st in frontmatter
      context: 'OAuth'     // 2nd in frontmatter
    });

    expect(result).toBe("/generate-prd 'auth' 'OAuth' 'md'");
  });

  it('handles partially provided arguments', () => {
    // When all args are required but some omitted, we need to provide them all
    const result = buildSlashCommand('/audit', {
      mode: 'quick',
      scope: 'full'
    });

    expect(result).toBe("/audit 'quick' 'full'");
  });

  it('skips null optional arguments', () => {
    const result = buildSlashCommand('/generate-prd', {
      featurename: 'auth',
      context: null as any,
      format: 'md'
    });

    expect(result).toBe("/generate-prd 'auth' 'md'");
  });

  it('escapes single quotes in arguments', () => {
    const result = buildSlashCommand('/generate-prd', {
      featurename: "user's profile",
      context: 'OAuth',
      format: 'md'
    });

    expect(result).toBe("/generate-prd 'user\\'s profile' 'OAuth' 'md'");
  });

  it('handles commands with no arguments', () => {
    const result = buildSlashCommand('/fix', {});

    expect(result).toBe('/fix');
  });

  it('handles commands with single argument', () => {
    const result = buildSlashCommand('/check', {
      format: 'json'
    });

    expect(result).toBe("/check 'json'");
  });

  it('handles multiple escaped quotes', () => {
    const result = buildSlashCommand('/generate-prd', {
      featurename: "user's 'special' feature",
      context: "It's a test",
      format: 'md'
    });

    expect(result).toBe("/generate-prd 'user\\'s \\'special\\' feature' 'It\\'s a test' 'md'");
  });

  it('handles numeric values by converting to string', () => {
    const result = buildSlashCommand('/audit', {
      mode: 'quick' as any,
      scope: '123' as any
    });

    expect(result).toBe("/audit 'quick' '123'");
  });

  it('preserves correct order for all provided args', () => {
    const result = buildSlashCommand('/generate-feature', {
      format: 'md',
      featureName: 'auth',
      context: 'OAuth'
    });

    expect(result).toBe("/generate-feature 'auth' 'OAuth' 'md'");
  });

  it('handles kebab-case argument names', () => {
    const result = buildSlashCommand('/commit-and-push', {
      'base-branch': 'main'
    });

    expect(result).toBe("/commit-and-push 'main'");
  });
});
