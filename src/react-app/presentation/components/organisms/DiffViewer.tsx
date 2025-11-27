import { useState } from 'react';
import type { DiffResult } from '../../../domain/entities/DiffResult';
import type { ViewMode, ExportFormat } from '../../../domain/types/diff';
import { DiffLine } from '../molecules/DiffLine';
import { Button } from '../atoms/Button';
import { ExportAdapter } from '../../../infrastructure/adapters/ExportAdapter';
import { createExportDiffUseCase, createCopyDiffUseCase } from '../../../application/use-cases/exportDiff';

export interface DiffViewerProps {
  readonly diffResult: DiffResult;
}

export const DiffViewer = ({ diffResult }: DiffViewerProps) => {
  const [viewMode, setViewMode] = useState<ViewMode>('unified');
  const [showUnchanged, setShowUnchanged] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const exportAdapter = new ExportAdapter();
  const exportDiffUseCase = createExportDiffUseCase(exportAdapter);
  const copyDiffUseCase = createCopyDiffUseCase(exportAdapter);

  const handleExport = async (format: ExportFormat) => {
    setIsExporting(true);
    try {
      const result = await exportDiffUseCase({
        diffResult,
        format,
      });

      if (!result.ok) {
        const message =
          result.error.type === 'unsupported-format'
            ? `Unsupported format: ${result.error.format}`
            : result.error.message;
        alert(`Export failed: ${message}`);
      }
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopy = async (format: ExportFormat) => {
    const result = await copyDiffUseCase(diffResult, format);
    if (result.ok) {
      alert('Copied to clipboard!');
    } else {
      const message =
        result.error.type === 'unsupported-format'
          ? `Unsupported format: ${result.error.format}`
          : result.error.message;
      alert(`Copy failed: ${message}`);
    }
  };

  const entries = diffResult.getEntries();
  const visibleEntries = showUnchanged
    ? entries
    : entries.filter(entry => entry.type !== 'unchanged');

  const stats = diffResult.getStats();

  const styles = {
    container: {
      backgroundColor: 'var(--bg-secondary)',
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden',
    },
    header: {
      padding: 'var(--spacing-lg)',
      borderBottom: '1px solid var(--border-color)',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      flexWrap: 'wrap' as const,
      gap: 'var(--spacing-md)',
    },
    title: {
      fontSize: 'var(--font-lg)',
      fontWeight: 700,
      color: 'var(--fg-primary)',
    },
    controls: {
      display: 'flex',
      gap: 'var(--spacing-md)',
      alignItems: 'center',
      flexWrap: 'wrap' as const,
    },
    viewModeButtons: {
      display: 'flex',
      gap: 'var(--spacing-xs)',
      backgroundColor: 'var(--bg-primary)',
      borderRadius: 'var(--radius-md)',
      padding: 'var(--spacing-xs)',
    },
    modeButton: (active: boolean) => ({
      padding: 'var(--spacing-xs) var(--spacing-md)',
      backgroundColor: active ? 'var(--accent-cyan)' : 'transparent',
      color: active ? 'var(--bg-primary)' : 'var(--fg-secondary)',
      border: 'none',
      borderRadius: 'var(--radius-sm)',
      cursor: 'pointer',
      fontSize: 'var(--font-xs)',
      fontWeight: 600,
      transition: 'all 0.2s',
    }),
    toggleButton: {
      fontSize: 'var(--font-xs)',
      padding: 'var(--spacing-xs) var(--spacing-sm)',
    },
    stats: {
      display: 'flex',
      gap: 'var(--spacing-lg)',
      padding: 'var(--spacing-md) var(--spacing-lg)',
      backgroundColor: 'var(--bg-primary)',
      borderBottom: '1px solid var(--border-color)',
    },
    stat: (color: string) => ({
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--spacing-xs)',
      fontSize: 'var(--font-sm)',
      color,
    }),
    count: {
      fontWeight: 700,
      fontSize: 'var(--font-md)',
    },
    entriesContainer: {
      maxHeight: '600px',
      overflowY: 'auto' as const,
      padding: 'var(--spacing-md)',
    },
    noChanges: {
      padding: 'var(--spacing-xl)',
      textAlign: 'center' as const,
      color: 'var(--fg-secondary)',
      fontSize: 'var(--font-md)',
    },
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>Comparison Results</h2>
        <div style={styles.controls}>
          <div style={styles.viewModeButtons}>
            <button
              style={styles.modeButton(viewMode === 'unified')}
              onClick={() => setViewMode('unified')}
            >
              Unified
            </button>
            <button
              style={styles.modeButton(viewMode === 'side-by-side')}
              onClick={() => setViewMode('side-by-side')}
            >
              Side-by-Side
            </button>
            <button
              style={styles.modeButton(viewMode === 'inline')}
              onClick={() => setViewMode('inline')}
            >
              Inline
            </button>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowUnchanged(!showUnchanged)}
          >
            {showUnchanged ? 'Hide' : 'Show'} Unchanged
          </Button>
          <div style={{ position: 'relative' as const }}>
            <Button
              variant="primary"
              size="sm"
              onClick={() => handleExport('json')}
              disabled={isExporting}
            >
              📥 Export JSON
            </Button>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleExport('markdown')}
            disabled={isExporting}
          >
            📄 Markdown
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleExport('html')}
            disabled={isExporting}
          >
            🌐 HTML
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleCopy('json')}
          >
            📋 Copy
          </Button>
        </div>
      </div>

      <div style={styles.stats}>
        <div style={styles.stat('var(--diff-added)')}>
          <span>Added:</span>
          <span style={styles.count}>{stats.added}</span>
        </div>
        <div style={styles.stat('var(--diff-removed)')}>
          <span>Removed:</span>
          <span style={styles.count}>{stats.removed}</span>
        </div>
        <div style={styles.stat('var(--diff-modified)')}>
          <span>Modified:</span>
          <span style={styles.count}>{stats.modified}</span>
        </div>
        <div style={styles.stat('var(--fg-secondary)')}>
          <span>Unchanged:</span>
          <span style={styles.count}>{stats.unchanged}</span>
        </div>
        <div style={styles.stat('var(--fg-primary)')}>
          <span>Total:</span>
          <span style={styles.count}>{stats.total}</span>
        </div>
      </div>

      <div style={styles.entriesContainer}>
        {visibleEntries.length === 0 ? (
          <div style={styles.noChanges}>
            {showUnchanged ? 'No entries to display' : 'No changes detected'}
          </div>
        ) : (
          visibleEntries.map((entry, index) => (
            <DiffLine key={index} entry={entry} viewMode={viewMode} />
          ))
        )}
      </div>
    </div>
  );
};
