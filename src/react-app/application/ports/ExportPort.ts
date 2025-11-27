import type { Result } from '../../domain/types/result';
import type { ExportFormat } from '../../domain/types/diff';

/**
 * Export error types
 */
export type ExportError =
  | { type: 'unsupported-format'; format: string }
  | { type: 'file-system-error'; message: string }
  | { type: 'unknown'; message: string };

/**
 * Export options
 */
export interface ExportOptions {
  readonly filename?: string;
  readonly format: ExportFormat;
}

/**
 * Port interface for export operations
 */
export interface ExportPort {
  /**
   * Exports data to a file
   */
  exportToFile(
    content: string,
    options: ExportOptions
  ): Promise<Result<void, ExportError>>;

  /**
   * Copies data to clipboard
   */
  copyToClipboard(content: string): Promise<Result<void, ExportError>>;

  /**
   * Downloads data as a file
   */
  downloadAsFile(
    content: string,
    filename: string,
    mimeType: string
  ): Promise<Result<void, ExportError>>;
}
