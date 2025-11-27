import type {
  DiffEntry,
  DiffStats,
  DiffMetadata,
  DiffResult as DiffResultType,
  CompareSettings,
} from '../types/diff';

/**
 * Entity representing a diff result
 */
export class DiffResult {
  constructor(
    private readonly id: string,
    private readonly entries: readonly DiffEntry[],
    private readonly stats: DiffStats,
    private readonly metadata: DiffMetadata
  ) {}

  /**
   * Creates a DiffResult from entries
   */
  static fromEntries(
    entries: readonly DiffEntry[],
    leftDocumentId: string,
    rightDocumentId: string,
    settings: CompareSettings,
    id?: string
  ): DiffResult {
    // Calculate statistics
    const stats = entries.reduce(
      (acc, entry) => {
        acc[entry.type]++;
        acc.total++;
        return acc;
      },
      { added: 0, removed: 0, modified: 0, unchanged: 0, total: 0 }
    );

    // Create metadata
    const metadata: DiffMetadata = {
      leftDocumentId,
      rightDocumentId,
      createdAt: new Date(),
      settings,
    };

    const resultId = id ?? crypto.randomUUID();

    return new DiffResult(resultId, entries, stats, metadata);
  }

  /**
   * Returns the diff ID
   */
  getId(): string {
    return this.id;
  }

  /**
   * Returns all diff entries
   */
  getEntries(): readonly DiffEntry[] {
    return this.entries;
  }

  /**
   * Returns diff statistics
   */
  getStats(): DiffStats {
    return this.stats;
  }

  /**
   * Returns diff metadata
   */
  getMetadata(): DiffMetadata {
    return this.metadata;
  }

  /**
   * Filters entries by type
   */
  getEntriesByType(type: DiffEntry['type']): readonly DiffEntry[] {
    return this.entries.filter(entry => entry.type === type);
  }

  /**
   * Checks if the diff has any changes
   */
  hasChanges(): boolean {
    return this.stats.added > 0 || this.stats.removed > 0 || this.stats.modified > 0;
  }

  /**
   * Returns a plain object representation
   */
  toObject(): DiffResultType {
    return {
      id: this.id,
      entries: this.entries,
      stats: this.stats,
      metadata: this.metadata,
    };
  }

  /**
   * Returns the comparison settings used
   */
  getSettings(): CompareSettings {
    return this.metadata.settings;
  }
}
