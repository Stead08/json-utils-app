import type { CompareSettings } from '../../../domain/types/diff';

export interface SettingsPanelProps {
  readonly settings: CompareSettings;
  readonly onChange: (settings: CompareSettings) => void;
}

export const SettingsPanel = ({ settings, onChange }: SettingsPanelProps) => {
  const styles = {
    container: {
      backgroundColor: 'var(--bg-secondary)',
      borderRadius: 'var(--radius-lg)',
      padding: 'var(--spacing-lg)',
      marginBottom: 'var(--spacing-lg)',
    },
    header: {
      fontSize: 'var(--font-md)',
      fontWeight: 700,
      color: 'var(--fg-primary)',
      marginBottom: 'var(--spacing-md)',
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--spacing-sm)',
    },
    grid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
      gap: 'var(--spacing-md)',
    },
    field: {
      display: 'flex',
      flexDirection: 'column' as const,
      gap: 'var(--spacing-xs)',
    },
    label: {
      fontSize: 'var(--font-sm)',
      color: 'var(--fg-secondary)',
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--spacing-xs)',
    },
    checkboxContainer: {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--spacing-sm)',
    },
    checkbox: {
      width: '18px',
      height: '18px',
      cursor: 'pointer',
      accentColor: 'var(--accent-cyan)',
    },
    input: {
      backgroundColor: 'var(--bg-primary)',
      color: 'var(--fg-primary)',
      border: '1px solid var(--border-color)',
      borderRadius: 'var(--radius-md)',
      padding: 'var(--spacing-sm)',
      fontSize: 'var(--font-sm)',
      fontFamily: 'inherit',
    },
    description: {
      fontSize: 'var(--font-xs)',
      color: 'var(--fg-tertiary)',
      marginTop: 'var(--spacing-xs)',
    },
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span>⚙️</span>
        <span>Comparison Settings</span>
      </div>

      <div style={styles.grid}>
        <div style={styles.field}>
          <div style={styles.checkboxContainer}>
            <input
              type="checkbox"
              id="ignoreArrayOrder"
              checked={settings.ignoreArrayOrder}
              onChange={(e) =>
                onChange({ ...settings, ignoreArrayOrder: e.target.checked })
              }
              style={styles.checkbox}
            />
            <label htmlFor="ignoreArrayOrder" style={styles.label}>
              Ignore Array Order
            </label>
          </div>
          <div style={styles.description}>
            Arrays with same elements in different order will be considered equal
          </div>
        </div>

        <div style={styles.field}>
          <div style={styles.checkboxContainer}>
            <input
              type="checkbox"
              id="treatNullAsUndefined"
              checked={settings.treatNullAsUndefined}
              onChange={(e) =>
                onChange({ ...settings, treatNullAsUndefined: e.target.checked })
              }
              style={styles.checkbox}
            />
            <label htmlFor="treatNullAsUndefined" style={styles.label}>
              Treat Null as Undefined
            </label>
          </div>
          <div style={styles.description}>
            null and undefined values will be considered equal
          </div>
        </div>

        <div style={styles.field}>
          <label htmlFor="keyField" style={styles.label}>
            Array Key Field
          </label>
          <input
            type="text"
            id="keyField"
            placeholder="e.g., id"
            value={settings.keyField ?? ''}
            onChange={(e) =>
              onChange({
                ...settings,
                keyField: e.target.value || undefined,
              })
            }
            style={styles.input}
          />
          <div style={styles.description}>
            Field to use for matching array elements (e.g., "id")
          </div>
        </div>

        <div style={styles.field}>
          <label htmlFor="floatTolerance" style={styles.label}>
            Float Tolerance
          </label>
          <input
            type="number"
            id="floatTolerance"
            placeholder="e.g., 0.0001"
            step="0.0001"
            min="0"
            value={settings.floatTolerance ?? ''}
            onChange={(e) =>
              onChange({
                ...settings,
                floatTolerance: e.target.value
                  ? parseFloat(e.target.value)
                  : undefined,
              })
            }
            style={styles.input}
          />
          <div style={styles.description}>
            Tolerance for floating point comparisons
          </div>
        </div>
      </div>
    </div>
  );
};
