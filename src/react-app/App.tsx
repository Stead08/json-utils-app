import { useDiff } from './presentation/hooks/useDiff';
import { Button } from './presentation/components/atoms/Button';
import { TextArea } from './presentation/components/atoms/TextArea';
import { DiffViewer } from './presentation/components/organisms/DiffViewer';
import { SettingsPanel } from './presentation/components/organisms/SettingsPanel';
import './presentation/styles/global.css';

function App() {
  const { state, actions, settings, setSettings } = useDiff();

  const handleCompare = () => {
    actions.compare();
  };

  const styles = {
    container: {
      minHeight: '100vh',
      padding: 'var(--spacing-xl)',
      backgroundColor: 'var(--bg-primary)',
    },
    header: {
      marginBottom: 'var(--spacing-xl)',
      textAlign: 'center' as const,
    },
    title: {
      fontSize: 'var(--font-xxl)',
      fontWeight: 700,
      color: 'var(--fg-primary)',
      marginBottom: 'var(--spacing-sm)',
    },
    subtitle: {
      fontSize: 'var(--font-md)',
      color: 'var(--fg-secondary)',
    },
    inputContainer: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 'var(--spacing-lg)',
      marginBottom: 'var(--spacing-lg)',
    },
    inputWrapper: {
      display: 'flex',
      flexDirection: 'column' as const,
      gap: 'var(--spacing-sm)',
    },
    formatButtonContainer: {
      display: 'flex',
      justifyContent: 'flex-end',
      gap: 'var(--spacing-sm)',
    },
    buttonContainer: {
      display: 'flex',
      gap: 'var(--spacing-md)',
      justifyContent: 'center',
      marginBottom: 'var(--spacing-xl)',
    },
    error: {
      padding: 'var(--spacing-md)',
      backgroundColor: 'var(--accent-red)',
      color: 'var(--fg-primary)',
      borderRadius: 'var(--radius-md)',
      marginBottom: 'var(--spacing-lg)',
    },
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>JSON Diff Tool</h1>
        <p style={styles.subtitle}>Compare JSON documents with semantic analysis</p>
      </header>

      {state.error && (
        <div style={styles.error}>
          <strong>Error:</strong>{' '}
          {state.error.type === 'LEFT_PARSE_ERROR'
            ? `Left JSON: ${state.error.error.getMessage()}`
            : state.error.type === 'RIGHT_PARSE_ERROR'
            ? `Right JSON: ${state.error.error.getMessage()}`
            : state.error.message}
        </div>
      )}

      <SettingsPanel settings={settings} onChange={setSettings} />

      <div style={styles.inputContainer}>
        <div style={styles.inputWrapper}>
          <TextArea
            label="Left JSON"
            placeholder="Paste your first JSON here..."
            value={state.leftInput}
            onChange={(e) => actions.setLeftInput(e.target.value)}
          />
          <div style={styles.formatButtonContainer}>
            <Button
              variant="secondary"
              size="sm"
              onClick={actions.formatLeftInput}
              disabled={!state.leftInput}
            >
              ✨ Format
            </Button>
          </div>
        </div>
        <div style={styles.inputWrapper}>
          <TextArea
            label="Right JSON"
            placeholder="Paste your second JSON here..."
            value={state.rightInput}
            onChange={(e) => actions.setRightInput(e.target.value)}
          />
          <div style={styles.formatButtonContainer}>
            <Button
              variant="secondary"
              size="sm"
              onClick={actions.formatRightInput}
              disabled={!state.rightInput}
            >
              ✨ Format
            </Button>
          </div>
        </div>
      </div>

      <div style={styles.buttonContainer}>
        <Button
          variant="primary"
          size="lg"
          onClick={handleCompare}
          disabled={state.isComparing || !state.leftInput || !state.rightInput}
        >
          {state.isComparing ? 'Comparing...' : 'Compare'}
        </Button>
        <Button
          variant="secondary"
          size="lg"
          onClick={actions.clear}
          disabled={!state.leftInput && !state.rightInput}
        >
          Clear
        </Button>
      </div>

      {state.diffResult && <DiffViewer diffResult={state.diffResult} />}
    </div>
  );
}

export default App;
