import { describe, it, expect } from 'vitest';
import { getPhaseId, getPhaseLabel } from './phase.utils';

describe('phase.utils', () => {
  describe('getPhaseId', () => {
    it('should return string when phase is string', () => {
      const result = getPhaseId('initialize');
      expect(result).toBe('initialize');
    });

    it('should return id when phase is object', () => {
      const result = getPhaseId({ id: 'init', label: 'Initialization' });
      expect(result).toBe('init');
    });
  });

  describe('getPhaseLabel', () => {
    it('should return string when phase is string', () => {
      const result = getPhaseLabel('initialize');
      expect(result).toBe('initialize');
    });

    it('should return label when phase is object', () => {
      const result = getPhaseLabel({ id: 'init', label: 'Initialization' });
      expect(result).toBe('Initialization');
    });

    it('should handle descriptive labels', () => {
      const result = getPhaseLabel({
        id: 'process',
        label: 'Processing Data & Validation'
      });
      expect(result).toBe('Processing Data & Validation');
    });
  });
});
