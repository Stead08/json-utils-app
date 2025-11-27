import { describe, it, expect } from 'vitest';
import { compareJson } from '../compareJson';
import type { CompareJsonInput } from '../compareJson';
import { DEFAULT_COMPARE_SETTINGS, DEFAULT_FORMAT_SETTINGS } from '../../../domain/types/diff';

describe('compareJson', () => {
  describe('basic comparison', () => {
    it('should compare two identical JSONs', () => {
      const input: CompareJsonInput = {
        leftJson: '{"name":"John","age":30}',
        rightJson: '{"name":"John","age":30}',
        settings: DEFAULT_COMPARE_SETTINGS,
      };

      const result = compareJson(input);

      expect(result.ok).toBe(true);
      if (result.ok) {
        const stats = result.value.diffResult.getStats();
        expect(stats.modified).toBe(0);
        expect(stats.added).toBe(0);
        expect(stats.removed).toBe(0);
      }
    });

    it('should detect modified values', () => {
      const input: CompareJsonInput = {
        leftJson: '{"name":"John","age":30}',
        rightJson: '{"name":"John","age":31}',
        settings: DEFAULT_COMPARE_SETTINGS,
      };

      const result = compareJson(input);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.diffResult.getStats().modified).toBeGreaterThan(0);
      }
    });

    it('should return error for invalid left JSON', () => {
      const input: CompareJsonInput = {
        leftJson: '{invalid}',
        rightJson: '{"valid":true}',
        settings: DEFAULT_COMPARE_SETTINGS,
      };

      const result = compareJson(input);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('LEFT_PARSE_ERROR');
      }
    });

    it('should return error for invalid right JSON', () => {
      const input: CompareJsonInput = {
        leftJson: '{"valid":true}',
        rightJson: '{invalid}',
        settings: DEFAULT_COMPARE_SETTINGS,
      };

      const result = compareJson(input);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('RIGHT_PARSE_ERROR');
      }
    });
  });

  describe('format before compare', () => {
    it('should format both JSONs before comparison when enabled', () => {
      const input: CompareJsonInput = {
        leftJson: '{"name":"John","age":30}',
        rightJson: '{"age":30,"name":"John"}',
        settings: {
          ...DEFAULT_COMPARE_SETTINGS,
          formatBeforeCompare: true,
          formatSettings: {
            indent: 2,
            sortKeys: true,
          },
        },
      };

      const result = compareJson(input);

      expect(result.ok).toBe(true);
      if (result.ok) {
        // After sorting keys, both JSONs should be identical
        expect(result.value.diffResult.getStats().modified).toBe(0);
        expect(result.value.diffResult.getStats().added).toBe(0);
        expect(result.value.diffResult.getStats().removed).toBe(0);
      }
    });

    it('should not format when formatBeforeCompare is false', () => {
      const input: CompareJsonInput = {
        leftJson: '{"name":"John","age":30}',
        rightJson: '{"age":30,"name":"John"}',
        settings: {
          ...DEFAULT_COMPARE_SETTINGS,
          formatBeforeCompare: false,
          formatSettings: {
            indent: 2,
            sortKeys: true,
          },
        },
      };

      const result = compareJson(input);

      expect(result.ok).toBe(true);
      if (result.ok) {
        // Without sorting, order is preserved, but values are still the same
        // The differ compares values, not structure, so no differences
        expect(result.value.diffResult.getStats().modified).toBe(0);
      }
    });

    it('should handle minified JSON with formatting', () => {
      const input: CompareJsonInput = {
        leftJson: '{"name":"Alice","scores":[95,87,92]}',
        rightJson: '{"scores":[95,87,92],"name":"Alice"}',
        settings: {
          ...DEFAULT_COMPARE_SETTINGS,
          formatBeforeCompare: true,
          formatSettings: {
            indent: 2,
            sortKeys: true,
          },
        },
      };

      const result = compareJson(input);

      expect(result.ok).toBe(true);
      if (result.ok) {
        // After sorting keys, both should be identical
        expect(result.value.diffResult.getStats().modified).toBe(0);
      }
    });

    it('should use original JSON when format fails', () => {
      const input: CompareJsonInput = {
        leftJson: '{invalid}',
        rightJson: '{"valid":true}',
        settings: {
          ...DEFAULT_COMPARE_SETTINGS,
          formatBeforeCompare: true,
          formatSettings: DEFAULT_FORMAT_SETTINGS,
        },
      };

      const result = compareJson(input);

      // Format fails, but parse error should still be caught
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('LEFT_PARSE_ERROR');
      }
    });

    it('should format with different indent sizes', () => {
      const input: CompareJsonInput = {
        leftJson: '{"name":"John"}',
        rightJson: '{"name":"John"}',
        settings: {
          ...DEFAULT_COMPARE_SETTINGS,
          formatBeforeCompare: true,
          formatSettings: {
            indent: 4,
            sortKeys: false,
          },
        },
      };

      const result = compareJson(input);

      expect(result.ok).toBe(true);
      if (result.ok) {
        // Indent size doesn't affect comparison, only formatting
        expect(result.value.diffResult.getStats().modified).toBe(0);
      }
    });

    it('should format with tabs', () => {
      const input: CompareJsonInput = {
        leftJson: '{"name":"John"}',
        rightJson: '{"name":"John"}',
        settings: {
          ...DEFAULT_COMPARE_SETTINGS,
          formatBeforeCompare: true,
          formatSettings: {
            indent: '\t',
            sortKeys: false,
          },
        },
      };

      const result = compareJson(input);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.diffResult.getStats().modified).toBe(0);
      }
    });

    it('should handle nested objects with key sorting', () => {
      const input: CompareJsonInput = {
        leftJson: '{"outer":{"z":1,"a":2},"z":3}',
        rightJson: '{"z":3,"outer":{"a":2,"z":1}}',
        settings: {
          ...DEFAULT_COMPARE_SETTINGS,
          formatBeforeCompare: true,
          formatSettings: {
            indent: 2,
            sortKeys: true,
          },
        },
      };

      const result = compareJson(input);

      expect(result.ok).toBe(true);
      if (result.ok) {
        // After sorting all keys recursively, both should be identical
        expect(result.value.diffResult.getStats().modified).toBe(0);
      }
    });

    it('should handle arrays without sorting elements', () => {
      const input: CompareJsonInput = {
        leftJson: '{"items":[3,1,2]}',
        rightJson: '{"items":[3,1,2]}',
        settings: {
          ...DEFAULT_COMPARE_SETTINGS,
          formatBeforeCompare: true,
          formatSettings: {
            indent: 2,
            sortKeys: true,
          },
        },
      };

      const result = compareJson(input);

      expect(result.ok).toBe(true);
      if (result.ok) {
        // Array elements order is preserved (not sorted)
        expect(result.value.diffResult.getStats().modified).toBe(0);
      }
    });

    it('should detect differences even after formatting', () => {
      const input: CompareJsonInput = {
        leftJson: '{"name":"Alice","age":25}',
        rightJson: '{"name":"Bob","age":25}',
        settings: {
          ...DEFAULT_COMPARE_SETTINGS,
          formatBeforeCompare: true,
          formatSettings: {
            indent: 2,
            sortKeys: true,
          },
        },
      };

      const result = compareJson(input);

      expect(result.ok).toBe(true);
      if (result.ok) {
        // Name is different
        expect(result.value.diffResult.getStats().modified).toBeGreaterThan(0);
      }
    });

    it('should handle empty objects with formatting', () => {
      const input: CompareJsonInput = {
        leftJson: '{}',
        rightJson: '{}',
        settings: {
          ...DEFAULT_COMPARE_SETTINGS,
          formatBeforeCompare: true,
          formatSettings: DEFAULT_FORMAT_SETTINGS,
        },
      };

      const result = compareJson(input);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.diffResult.getStats().modified).toBe(0);
      }
    });
  });

  describe('complex scenarios', () => {
    it('should handle large nested structures with formatting', () => {
      const leftJson = JSON.stringify({
        users: [
          { id: 1, name: 'Alice', settings: { theme: 'dark', notifications: true } },
          { id: 2, name: 'Bob', settings: { theme: 'light', notifications: false } },
        ],
        metadata: { version: '1.0', timestamp: '2024-01-01' },
      });

      const rightJson = JSON.stringify({
        metadata: { timestamp: '2024-01-01', version: '1.0' },
        users: [
          { settings: { notifications: true, theme: 'dark' }, name: 'Alice', id: 1 },
          { settings: { notifications: false, theme: 'light' }, name: 'Bob', id: 2 },
        ],
      });

      const input: CompareJsonInput = {
        leftJson,
        rightJson,
        settings: {
          ...DEFAULT_COMPARE_SETTINGS,
          formatBeforeCompare: true,
          formatSettings: {
            indent: 2,
            sortKeys: true,
          },
        },
      };

      const result = compareJson(input);

      expect(result.ok).toBe(true);
      if (result.ok) {
        // After sorting all keys, both should be identical
        expect(result.value.diffResult.getStats().modified).toBe(0);
      }
    });

    it('should combine format settings with compare settings', () => {
      const input: CompareJsonInput = {
        leftJson: '{"items":[{"id":1},{"id":2}]}',
        rightJson: '{"items":[{"id":2},{"id":1}]}',
        settings: {
          ...DEFAULT_COMPARE_SETTINGS,
          formatBeforeCompare: true,
          formatSettings: {
            indent: 2,
            sortKeys: true,
          },
          ignoreArrayOrder: true,
          keyField: 'id',
        },
      };

      const result = compareJson(input);

      expect(result.ok).toBe(true);
      if (result.ok) {
        // With ignoreArrayOrder and keyField, arrays should match
        expect(result.value.diffResult.getStats().modified).toBe(0);
      }
    });
  });
});
