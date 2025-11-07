import { describe, test, expect } from 'vitest';
import { Channels, parseChannel } from './channels';

describe('Channel Builders', () => {
  describe('Channels.session', () => {
    test('returns correct session channel format', () => {
      expect(Channels.session('abc123')).toBe('session:abc123');
    });

    test('handles UUID session IDs', () => {
      const uuid = '550e8400-e29b-41d4-a716-446655440000';
      expect(Channels.session(uuid)).toBe(`session:${uuid}`);
    });

    test('handles numeric session IDs', () => {
      expect(Channels.session('12345')).toBe('session:12345');
    });
  });

  describe('Channels.project', () => {
    test('returns correct project channel format', () => {
      expect(Channels.project('proj-123')).toBe('project:proj-123');
    });

    test('handles UUID project IDs', () => {
      const uuid = '123e4567-e89b-12d3-a456-426614174000';
      expect(Channels.project(uuid)).toBe(`project:${uuid}`);
    });
  });

  describe('Channels.shell', () => {
    test('returns correct shell channel format', () => {
      expect(Channels.shell('shell-abc')).toBe('shell:shell-abc');
    });

    test('handles UUID shell IDs', () => {
      const uuid = '789e0123-e45f-67cd-89ab-012345678901';
      expect(Channels.shell(uuid)).toBe(`shell:${uuid}`);
    });
  });

  describe('Channels.global', () => {
    test('returns global channel', () => {
      expect(Channels.global()).toBe('global');
    });
  });

  describe('parseChannel', () => {
    test('extracts resource and ID from session channel', () => {
      const result = parseChannel('session:abc123');
      expect(result).toEqual({
        resource: 'session',
        id: 'abc123',
      });
    });

    test('extracts resource and ID from project channel', () => {
      const result = parseChannel('project:proj-456');
      expect(result).toEqual({
        resource: 'project',
        id: 'proj-456',
      });
    });

    test('extracts resource and ID from shell channel', () => {
      const result = parseChannel('shell:shell-789');
      expect(result).toEqual({
        resource: 'shell',
        id: 'shell-789',
      });
    });

    test('extracts resource and ID with UUID', () => {
      const uuid = '550e8400-e29b-41d4-a716-446655440000';
      const result = parseChannel(`session:${uuid}`);
      expect(result).toEqual({
        resource: 'session',
        id: uuid,
      });
    });

    test('returns null for invalid format (no colon)', () => {
      expect(parseChannel('invalid')).toBeNull();
    });

    test('handles IDs with colons (treats everything after first colon as ID)', () => {
      // Note: parseChannel allows colons in IDs since some IDs might contain them
      const result = parseChannel('session:123:extra');
      expect(result).toEqual({
        resource: 'session',
        id: '123:extra',
      });
    });

    test('returns null for empty channel', () => {
      expect(parseChannel('')).toBeNull();
    });

    test('returns null for channel with empty resource', () => {
      expect(parseChannel(':123')).toBeNull();
    });

    test('returns null for channel with empty ID', () => {
      expect(parseChannel('session:')).toBeNull();
    });

    test('handles global channel', () => {
      const result = parseChannel('global');
      expect(result).toEqual({
        resource: 'global',
        id: '',
      });
    });
  });
});
