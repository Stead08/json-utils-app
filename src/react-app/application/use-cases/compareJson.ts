import type { Result } from '../../domain/types/result';
import { ok, err } from '../../domain/types/result';
import type { CompareSettings } from '../../domain/types/diff';
import { JsonDocument } from '../../domain/entities/JsonDocument';
import { DiffResult } from '../../domain/entities/DiffResult';
import { computeDiff } from '../../domain/functions/differ';
import { formatJson } from '../../domain/functions/formatter';
import type { ValidationError } from '../../domain/value-objects/ValidationError';

/**
 * Input for comparing JSON
 */
export interface CompareJsonInput {
  readonly leftJson: string;
  readonly rightJson: string;
  readonly settings: CompareSettings;
}

/**
 * Output from comparing JSON
 */
export interface CompareJsonOutput {
  readonly leftDocument: JsonDocument;
  readonly rightDocument: JsonDocument;
  readonly diffResult: DiffResult;
}

/**
 * Error types for JSON comparison
 */
export type CompareJsonError =
  | { type: 'LEFT_PARSE_ERROR'; error: ValidationError }
  | { type: 'RIGHT_PARSE_ERROR'; error: ValidationError };

/**
 * Use case for comparing two JSON documents
 */
export const compareJson = (
  input: CompareJsonInput
): Result<CompareJsonOutput, CompareJsonError> => {
  // 1. Format JSONs if requested
  let leftJson = input.leftJson;
  let rightJson = input.rightJson;

  if (input.settings.formatBeforeCompare) {
    const leftFormatResult = formatJson(leftJson, input.settings.formatSettings);
    if (leftFormatResult.ok) {
      leftJson = leftFormatResult.value;
    }
    // If format fails, use original string (will be caught during parse)

    const rightFormatResult = formatJson(rightJson, input.settings.formatSettings);
    if (rightFormatResult.ok) {
      rightJson = rightFormatResult.value;
    }
  }

  // 2. Parse left JSON
  const leftResult = JsonDocument.fromString(leftJson, 'left');
  if (!leftResult.ok) {
    return err({ type: 'LEFT_PARSE_ERROR', error: leftResult.error });
  }

  // 3. Parse right JSON
  const rightResult = JsonDocument.fromString(rightJson, 'right');
  if (!rightResult.ok) {
    return err({ type: 'RIGHT_PARSE_ERROR', error: rightResult.error });
  }

  const leftDocument = leftResult.value;
  const rightDocument = rightResult.value;

  // 4. Compute diff
  const entries = computeDiff(
    leftDocument.getData(),
    rightDocument.getData(),
    input.settings
  );

  // 5. Create diff result
  const diffResult = DiffResult.fromEntries(
    entries,
    leftDocument.getId(),
    rightDocument.getId(),
    input.settings
  );

  return ok({
    leftDocument,
    rightDocument,
    diffResult,
  });
};
