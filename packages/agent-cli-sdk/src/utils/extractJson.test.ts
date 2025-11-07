import { describe, it, expect } from 'vitest';
import { extractJSON } from './extractJson';

describe('extractJSON', () => {
  it('should parse direct JSON object', () => {
    const result = extractJSON('{"name":"Alice","age":30}');
    expect(result).toEqual({ name: 'Alice', age: 30 });
  });

  it('should parse direct JSON array', () => {
    const result = extractJSON('[1, 2, 3]');
    expect(result).toEqual([1, 2, 3]);
  });

  it('should extract from markdown json code block', () => {
    const text = '```json\n{"name":"Bob"}\n```';
    const result = extractJSON(text);
    expect(result).toEqual({ name: 'Bob' });
  });

  it('should extract from markdown code block without language', () => {
    const text = '```\n{"name":"Charlie"}\n```';
    const result = extractJSON(text);
    expect(result).toEqual({ name: 'Charlie' });
  });

  it('should extract JSON object from mixed text', () => {
    const text = 'Here is the data: {"status":"success","value":42} and more text';
    const result = extractJSON(text);
    expect(result).toEqual({ status: 'success', value: 42 });
  });

  it('should extract JSON array from mixed text', () => {
    const text = 'The results are: [10, 20, 30]';
    const result = extractJSON(text);
    expect(result).toEqual([10, 20, 30]);
  });

  it('should handle whitespace', () => {
    const text = '  \n  {"key": "value"}  \n  ';
    const result = extractJSON(text);
    expect(result).toEqual({ key: 'value' });
  });

  it('should return null for empty string', () => {
    const result = extractJSON('');
    expect(result).toBeNull();
  });

  it('should return null for invalid input', () => {
    const result = extractJSON('Just plain text with no JSON');
    expect(result).toBeNull();
  });

  it('should return null for malformed JSON', () => {
    const result = extractJSON('{invalid json}');
    expect(result).toBeNull();
  });
});
