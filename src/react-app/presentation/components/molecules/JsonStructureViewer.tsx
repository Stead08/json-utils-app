import { useState } from 'react';
import type { JsonValue } from '../../../domain/types/json';
import type { DiffEntry } from '../../../domain/types/diff';

export interface JsonStructureViewerProps {
  readonly leftData: JsonValue;
  readonly rightData: JsonValue;
  readonly diffEntries: readonly DiffEntry[];
}

interface JsonNodeProps {
  readonly value: JsonValue;
  readonly path: readonly (string | number)[];
  readonly diffEntries: readonly DiffEntry[];
  readonly side: 'left' | 'right';
}

/**
 * Finds the diff entry for a given path
 */
const findDiffEntry = (
  path: readonly (string | number)[],
  diffEntries: readonly DiffEntry[]
): DiffEntry | undefined => {
  return diffEntries.find(
    (entry) =>
      entry.path.length === path.length &&
      entry.path.every((p, i) => p === path[i])
  );
};

/**
 * Gets the background color for a diff type
 */
const getDiffBackground = (
  diffType: DiffEntry['type'] | undefined,
  side: 'left' | 'right'
): string => {
  if (!diffType || diffType === 'unchanged') return 'transparent';

  if (diffType === 'added') {
    return side === 'right' ? 'var(--diff-added-bg)' : 'transparent';
  }
  if (diffType === 'removed') {
    return side === 'left' ? 'var(--diff-removed-bg)' : 'transparent';
  }
  if (diffType === 'modified') {
    return 'var(--diff-modified-bg)';
  }

  return 'transparent';
};

/**
 * Recursive component to render a JSON node
 */
const JsonNode = ({ value, path, diffEntries, side }: JsonNodeProps) => {
  const [isExpanded, setIsExpanded] = useState(true);

  const diffEntry = findDiffEntry(path, diffEntries);
  const bgColor = getDiffBackground(diffEntry?.type, side);

  const styles = {
    node: {
      fontFamily: 'var(--font-mono)',
      fontSize: 'var(--font-sm)',
      lineHeight: '1.6',
    },
    line: {
      display: 'flex',
      alignItems: 'flex-start',
      gap: 'var(--spacing-xs)',
      padding: '2px var(--spacing-xs)',
      backgroundColor: bgColor,
      borderRadius: 'var(--radius-xs)',
    },
    key: {
      color: 'var(--accent-purple)',
      fontWeight: 600,
    },
    colon: {
      color: 'var(--fg-secondary)',
    },
    value: {
      color: 'var(--fg-primary)',
    },
    string: {
      color: 'var(--accent-green)',
    },
    number: {
      color: 'var(--accent-orange)',
    },
    boolean: {
      color: 'var(--accent-pink)',
    },
    null: {
      color: 'var(--fg-tertiary)',
    },
    bracket: {
      color: 'var(--fg-secondary)',
      fontWeight: 700,
    },
    expandButton: {
      background: 'none',
      border: 'none',
      color: 'var(--accent-cyan)',
      cursor: 'pointer',
      padding: '0 var(--spacing-xs)',
      fontSize: 'var(--font-xs)',
      minWidth: '20px',
    },
    indent: (level: number) => ({
      marginLeft: `${level * 20}px`,
    }),
  };

  // Null or undefined
  if (value === null || value === undefined) {
    return (
      <div style={{ ...styles.node, ...styles.line }}>
        <span style={styles.null}>{value === null ? 'null' : 'undefined'}</span>
      </div>
    );
  }

  // Primitive types
  if (typeof value === 'string') {
    return (
      <div style={{ ...styles.node, ...styles.line }}>
        <span style={styles.string}>"{value}"</span>
      </div>
    );
  }

  if (typeof value === 'number') {
    return (
      <div style={{ ...styles.node, ...styles.line }}>
        <span style={styles.number}>{value}</span>
      </div>
    );
  }

  if (typeof value === 'boolean') {
    return (
      <div style={{ ...styles.node, ...styles.line }}>
        <span style={styles.boolean}>{String(value)}</span>
      </div>
    );
  }

  // Array
  if (Array.isArray(value)) {
    return (
      <div style={styles.node}>
        <div style={styles.line}>
          <button
            style={styles.expandButton}
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? '▼' : '▶'}
          </button>
          <span style={styles.bracket}>
            [{value.length > 0 && !isExpanded ? '...' : ''}
          </span>
          {!isExpanded && <span style={styles.bracket}>]</span>}
        </div>
        {isExpanded && (
          <>
            {value.map((item, index) => (
              <div key={index} style={styles.indent(1)}>
                <div style={{ display: 'flex', gap: 'var(--spacing-xs)' }}>
                  <span style={styles.key}>{index}</span>
                  <span style={styles.colon}>:</span>
                  <JsonNode
                    value={item}
                    path={[...path, index]}
                    diffEntries={diffEntries}
                    side={side}
                  />
                </div>
              </div>
            ))}
            <div style={styles.line}>
              <span style={styles.bracket}>]</span>
            </div>
          </>
        )}
      </div>
    );
  }

  // Object
  if (typeof value === 'object') {
    const entries = Object.entries(value);
    return (
      <div style={styles.node}>
        <div style={styles.line}>
          <button
            style={styles.expandButton}
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? '▼' : '▶'}
          </button>
          <span style={styles.bracket}>
            {'{'}{entries.length > 0 && !isExpanded ? '...' : ''}
          </span>
          {!isExpanded && <span style={styles.bracket}>{'}'}</span>}
        </div>
        {isExpanded && (
          <>
            {entries.map(([key, val]) => (
              <div key={key} style={styles.indent(1)}>
                <div style={{ display: 'flex', gap: 'var(--spacing-xs)' }}>
                  <span style={styles.key}>"{key}"</span>
                  <span style={styles.colon}>:</span>
                  <JsonNode
                    value={val}
                    path={[...path, key]}
                    diffEntries={diffEntries}
                    side={side}
                  />
                </div>
              </div>
            ))}
            <div style={styles.line}>
              <span style={styles.bracket}>{'}'}</span>
            </div>
          </>
        )}
      </div>
    );
  }

  return null;
};

/**
 * Component to display JSON structures side-by-side with diff highlighting
 */
export const JsonStructureViewer = ({
  leftData,
  rightData,
  diffEntries,
}: JsonStructureViewerProps) => {
  const styles = {
    container: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 'var(--spacing-lg)',
      padding: 'var(--spacing-md)',
      backgroundColor: 'var(--bg-primary)',
    },
    panel: {
      backgroundColor: 'var(--bg-secondary)',
      borderRadius: 'var(--radius-md)',
      padding: 'var(--spacing-md)',
      overflow: 'auto',
      maxHeight: '600px',
    },
    header: {
      fontSize: 'var(--font-sm)',
      fontWeight: 700,
      color: 'var(--fg-secondary)',
      marginBottom: 'var(--spacing-sm)',
      padding: 'var(--spacing-xs)',
      borderBottom: '1px solid var(--border-color)',
    },
  };

  return (
    <div style={styles.container}>
      <div style={styles.panel}>
        <div style={styles.header}>Left JSON</div>
        <JsonNode value={leftData} path={[]} diffEntries={diffEntries} side="left" />
      </div>
      <div style={styles.panel}>
        <div style={styles.header}>Right JSON</div>
        <JsonNode value={rightData} path={[]} diffEntries={diffEntries} side="right" />
      </div>
    </div>
  );
};
