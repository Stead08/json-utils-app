import type { JsonValue } from './json';

/**
 * Type of change in a diff
 */
export type DiffType = 'added' | 'removed' | 'modified' | 'unchanged';

/**
 * Represents a single diff entry
 */
export interface DiffEntry {
  readonly type: DiffType;
  readonly path: readonly string[];
  readonly leftValue?: JsonValue;
  readonly rightValue?: JsonValue;
}

/**
 * Statistics about a diff result
 */
export interface DiffStats {
  readonly added: number;
  readonly removed: number;
  readonly modified: number;
  readonly unchanged: number;
  readonly total: number;
}

/**
 * Metadata about a diff result
 */
export interface DiffMetadata {
  readonly leftDocumentId: string;
  readonly rightDocumentId: string;
  readonly createdAt: Date;
  readonly settings: CompareSettings;
}

/**
 * Complete diff result
 */
export interface DiffResult {
  readonly id: string;
  readonly entries: readonly DiffEntry[];
  readonly stats: DiffStats;
  readonly metadata: DiffMetadata;
}

/**
 * Format settings for JSON formatting
 */
export interface FormatSettings {
  readonly indent: 2 | 4 | '\t';
  readonly sortKeys: boolean;
}

/**
 * Default format settings
 */
export const DEFAULT_FORMAT_SETTINGS: FormatSettings = {
  indent: 2,
  sortKeys: false,
};

/**
 * Settings for JSON comparison
 */
export interface CompareSettings {
  readonly ignoreArrayOrder: boolean;
  readonly keyField?: string;
  readonly floatTolerance?: number;
  readonly treatNullAsUndefined: boolean;
  readonly formatBeforeCompare: boolean;
  readonly formatSettings: FormatSettings;
}

/**
 * Default comparison settings
 */
export const DEFAULT_COMPARE_SETTINGS: CompareSettings = {
  ignoreArrayOrder: false,
  treatNullAsUndefined: false,
  formatBeforeCompare: false,
  formatSettings: DEFAULT_FORMAT_SETTINGS,
};

/**
 * View mode for displaying diffs
 */
export type ViewMode = 'side-by-side' | 'unified' | 'inline';

/**
 * Export format for diff results
 */
export type ExportFormat = 'json' | 'markdown' | 'html' | 'json-patch';
