import type { TextareaHTMLAttributes } from 'react';

/**
 * TextArea props
 */
export interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

/**
 * TextArea component
 */
export const TextArea = ({
  label,
  error,
  helperText,
  className = '',
  ...props
}: TextAreaProps) => {
  const styles = {
    container: {
      display: 'flex',
      flexDirection: 'column' as const,
      gap: 'var(--spacing-sm)',
      width: '100%',
    },
    label: {
      fontSize: 'var(--font-sm)',
      fontWeight: 500,
      color: 'var(--fg-primary)',
    },
    textarea: {
      width: '100%',
      padding: 'var(--spacing-md)',
      fontSize: 'var(--font-sm)',
      fontFamily: 'var(--font-mono)',
      color: 'var(--fg-primary)',
      backgroundColor: 'var(--bg-secondary)',
      border: error ? '1px solid var(--accent-red)' : '1px solid var(--bg-tertiary)',
      borderRadius: 'var(--radius-md)',
      resize: 'vertical' as const,
      minHeight: '200px',
      lineHeight: 1.5,
    },
    error: {
      fontSize: 'var(--font-xs)',
      color: 'var(--accent-red)',
    },
    helperText: {
      fontSize: 'var(--font-xs)',
      color: 'var(--fg-secondary)',
    },
  };

  return (
    <div style={styles.container}>
      {label && <label style={styles.label}>{label}</label>}
      <textarea
        style={styles.textarea}
        className={className}
        {...props}
      />
      {error && <span style={styles.error}>{error}</span>}
      {helperText && !error && <span style={styles.helperText}>{helperText}</span>}
    </div>
  );
};
