import type { DiffEntry } from '../../../domain/types/diff';

export interface DiffLineProps {
  readonly entry: DiffEntry;
  readonly viewMode?: 'side-by-side' | 'unified' | 'inline';
}

export const DiffLine = ({ entry, viewMode = 'unified' }: DiffLineProps) => {
  const getTypeColor = (type: DiffEntry['type']) => {
    switch (type) {
      case 'added':
        return 'var(--diff-added)';
      case 'removed':
        return 'var(--diff-removed)';
      case 'modified':
        return 'var(--diff-modified)';
      case 'unchanged':
        return 'var(--fg-secondary)';
    }
  };

  const getTypeSymbol = (type: DiffEntry['type']) => {
    switch (type) {
      case 'added':
        return '+ ';
      case 'removed':
        return '- ';
      case 'modified':
        return '± ';
      case 'unchanged':
        return '  ';
    }
  };

  const formatValue = (value: unknown): string => {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (typeof value === 'string') return `"${value}"`;
    if (typeof value === 'object') return JSON.stringify(value, null, 2);
    return String(value);
  };

  const pathStr = entry.path.join('.');
  const color = getTypeColor(entry.type);
  const symbol = getTypeSymbol(entry.type);

  const styles = {
    line: {
      fontFamily: 'var(--font-mono)',
      fontSize: 'var(--font-sm)',
      padding: 'var(--spacing-xs) var(--spacing-md)',
      borderLeft: `4px solid ${color}`,
      backgroundColor:
        entry.type === 'unchanged' ? 'transparent' : `${color}10`,
      marginBottom: '1px',
      display: 'flex',
      gap: 'var(--spacing-md)',
    },
    symbol: {
      color,
      fontWeight: 700,
      minWidth: '20px',
    },
    path: {
      color: 'var(--accent-cyan)',
      fontWeight: 600,
      minWidth: '200px',
    },
    value: {
      color: 'var(--fg-primary)',
      whiteSpace: 'pre-wrap' as const,
      wordBreak: 'break-all' as const,
      flex: 1,
    },
  };

  if (viewMode === 'side-by-side' && entry.type === 'modified') {
    return (
      <div style={{ ...styles.line, flexDirection: 'column' }}>
        <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
          <span style={styles.symbol}>-</span>
          <span style={styles.path}>{pathStr}</span>
          <span style={{ ...styles.value, color: 'var(--diff-removed)' }}>
            {formatValue(entry.leftValue)}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
          <span style={styles.symbol}>+</span>
          <span style={styles.path}>{pathStr}</span>
          <span style={{ ...styles.value, color: 'var(--diff-added)' }}>
            {formatValue(entry.rightValue)}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.line}>
      <span style={styles.symbol}>{symbol}</span>
      <span style={styles.path}>{pathStr}</span>
      {entry.type === 'added' && (
        <span style={styles.value}>{formatValue(entry.rightValue)}</span>
      )}
      {entry.type === 'removed' && (
        <span style={styles.value}>{formatValue(entry.leftValue)}</span>
      )}
      {entry.type === 'modified' && (
        <span style={styles.value}>
          {formatValue(entry.leftValue)} → {formatValue(entry.rightValue)}
        </span>
      )}
      {entry.type === 'unchanged' && (
        <span style={styles.value}>{formatValue(entry.leftValue)}</span>
      )}
    </div>
  );
};
