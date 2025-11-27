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
 * Settings for JSON comparison
 */
export interface CompareSettings {
  readonly ignoreArrayOrder: boolean;
  readonly keyField?: string;
  readonly floatTolerance?: number;
  readonly treatNullAsUndefined: boolean;
}

/**
 * Default comparison settings
 */
export const DEFAULT_COMPARE_SETTINGS: CompareSettings = {
  ignoreArrayOrder: false,
  treatNullAsUndefined: false,
};

/**
 * View mode for displaying diffs
 */
export type ViewMode = 'side-by-side' | 'unified' | 'inline';

/**
 * Export format for diff results
 */
export type ExportFormat = 'json' | 'markdown' | 'html' | 'json-patch';
