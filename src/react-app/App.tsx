import { useDiff } from './presentation/hooks/useDiff';
import { Button } from './presentation/components/atoms/Button';
import { TextArea } from './presentation/components/atoms/TextArea';
import './presentation/styles/global.css';

function App() {
  const { state, actions } = useDiff();

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
    buttonContainer: {
      display: 'flex',
      gap: 'var(--spacing-md)',
      justifyContent: 'center',
      marginBottom: 'var(--spacing-xl)',
    },
    results: {
      padding: 'var(--spacing-lg)',
      backgroundColor: 'var(--bg-secondary)',
      borderRadius: 'var(--radius-lg)',
      marginTop: 'var(--spacing-lg)',
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

      <div style={styles.inputContainer}>
        <TextArea
          label="Left JSON"
          placeholder="Paste your first JSON here..."
          value={state.leftInput}
          onChange={(e) => actions.setLeftInput(e.target.value)}
        />
        <TextArea
          label="Right JSON"
          placeholder="Paste your second JSON here..."
          value={state.rightInput}
          onChange={(e) => actions.setRightInput(e.target.value)}
        />
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

      {state.diffResult && (
        <div style={styles.results}>
          <h2 style={{ marginBottom: 'var(--spacing-md)', color: 'var(--fg-primary)' }}>
            Comparison Results
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--spacing-md)' }}>
            <div>
              <div style={{ fontSize: 'var(--font-xs)', color: 'var(--fg-secondary)' }}>Added</div>
              <div style={{ fontSize: 'var(--font-xl)', color: 'var(--diff-added)', fontWeight: 700 }}>
                {state.diffResult.getStats().added}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 'var(--font-xs)', color: 'var(--fg-secondary)' }}>Removed</div>
              <div style={{ fontSize: 'var(--font-xl)', color: 'var(--diff-removed)', fontWeight: 700 }}>
                {state.diffResult.getStats().removed}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 'var(--font-xs)', color: 'var(--fg-secondary)' }}>Modified</div>
              <div style={{ fontSize: 'var(--font-xl)', color: 'var(--diff-modified)', fontWeight: 700 }}>
                {state.diffResult.getStats().modified}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 'var(--font-xs)', color: 'var(--fg-secondary)' }}>Total</div>
              <div style={{ fontSize: 'var(--font-xl)', color: 'var(--fg-primary)', fontWeight: 700 }}>
                {state.diffResult.getStats().total}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
