import { describe, it, expect, vi } from 'vitest';
import { createLineBuffer } from './lineBuffer';

describe('createLineBuffer', () => {
  it('should emit complete lines immediately', () => {
    const lines: string[] = [];
    const buffer = createLineBuffer((line) => lines.push(line));

    buffer.add('line1\nline2\nline3\n');

    expect(lines).toEqual(['line1', 'line2', 'line3']);
  });

  it('should buffer incomplete lines', () => {
    const lines: string[] = [];
    const buffer = createLineBuffer((line) => lines.push(line));

    buffer.add('incomplete');
    expect(lines).toEqual([]);

    buffer.add(' line\n');
    expect(lines).toEqual(['incomplete line']);
  });

  it('should handle split JSON across multiple chunks', () => {
    const lines: string[] = [];
    const buffer = createLineBuffer((line) => lines.push(line));

    buffer.add('{"type":"mes');
    buffer.add('sage","content"');
    buffer.add(':"hello"}\n');

    expect(lines).toEqual(['{"type":"message","content":"hello"}']);
  });

  it('should skip empty lines', () => {
    const lines: string[] = [];
    const buffer = createLineBuffer((line) => lines.push(line));

    buffer.add('\n\nline1\n\nline2\n\n');

    expect(lines).toEqual(['line1', 'line2']);
  });

  it('should handle whitespace-only lines', () => {
    const lines: string[] = [];
    const buffer = createLineBuffer((line) => lines.push(line));

    buffer.add('   \n\t\n  line  \n   \n');

    expect(lines).toEqual(['  line  ']);
  });

  it('should flush remaining buffer', () => {
    const lines: string[] = [];
    const buffer = createLineBuffer((line) => lines.push(line));

    buffer.add('line1\nincomplete');
    expect(lines).toEqual(['line1']);

    buffer.flush();
    expect(lines).toEqual(['line1', 'incomplete']);
  });

  it('should not emit empty buffer on flush', () => {
    const lines: string[] = [];
    const buffer = createLineBuffer((line) => lines.push(line));

    buffer.add('line1\n');
    buffer.flush();

    expect(lines).toEqual(['line1']);
  });

  it('should not emit whitespace-only buffer on flush', () => {
    const lines: string[] = [];
    const buffer = createLineBuffer((line) => lines.push(line));

    buffer.add('line1\n   \t  ');
    buffer.flush();

    expect(lines).toEqual(['line1']);
  });

  it('should handle multiple flushes', () => {
    const lines: string[] = [];
    const buffer = createLineBuffer((line) => lines.push(line));

    buffer.add('incomplete1');
    buffer.flush();
    expect(lines).toEqual(['incomplete1']);

    buffer.add('incomplete2');
    buffer.flush();
    expect(lines).toEqual(['incomplete1', 'incomplete2']);
  });

  it('should reset buffer after flush', () => {
    const lines: string[] = [];
    const buffer = createLineBuffer((line) => lines.push(line));

    buffer.add('incomplete');
    buffer.flush();
    buffer.add('new line\n');

    expect(lines).toEqual(['incomplete', 'new line']);
  });

  it('should handle single character chunks', () => {
    const lines: string[] = [];
    const buffer = createLineBuffer((line) => lines.push(line));

    'hello\n'.split('').forEach((char) => buffer.add(char));

    expect(lines).toEqual(['hello']);
  });

  it('should handle JSONL streaming format', () => {
    const lines: string[] = [];
    const buffer = createLineBuffer((line) => lines.push(line));

    // Simulate streaming JSONL where lines arrive in chunks
    buffer.add('{"event":"start","id":1}\n{"ev');
    buffer.add('ent":"data","id":2}\n{"event"');
    buffer.add(':"end","id":3}\n');

    expect(lines).toEqual(['{"event":"start","id":1}', '{"event":"data","id":2}', '{"event":"end","id":3}']);
  });

  it('should invoke callback for each line', () => {
    const callback = vi.fn();
    const buffer = createLineBuffer(callback);

    buffer.add('line1\nline2\nline3\n');

    expect(callback).toHaveBeenCalledTimes(3);
    expect(callback).toHaveBeenNthCalledWith(1, 'line1');
    expect(callback).toHaveBeenNthCalledWith(2, 'line2');
    expect(callback).toHaveBeenNthCalledWith(3, 'line3');
  });

  it('should handle empty string chunks', () => {
    const lines: string[] = [];
    const buffer = createLineBuffer((line) => lines.push(line));

    buffer.add('');
    buffer.add('line1\n');
    buffer.add('');

    expect(lines).toEqual(['line1']);
  });

  it('should preserve line content exactly (no trimming)', () => {
    const lines: string[] = [];
    const buffer = createLineBuffer((line) => lines.push(line));

    buffer.add('  spaced line  \n');

    expect(lines).toEqual(['  spaced line  ']);
  });
});
