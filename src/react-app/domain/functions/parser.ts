import type { JsonValue } from '../types/json';
import type { Result } from '../types/result';
import { ok, err } from '../types/result';
import { ValidationError } from '../value-objects/ValidationError';

/**
 * Maximum size for JSON input (10MB)
 */
export const MAX_JSON_SIZE = 10 * 1024 * 1024;

/**
 * Parses a JSON string into a JsonValue
 */
export const parseJson = (input: string): Result<JsonValue, ValidationError> => {
  // Check if empty
  if (!input || input.trim().length === 0) {
    return err(ValidationError.empty());
  }

  // Check size
  const size = new Blob([input]).size;
  if (size > MAX_JSON_SIZE) {
    return err(ValidationError.tooLarge(MAX_JSON_SIZE, size));
  }

  // Parse JSON
  try {
    const data = JSON.parse(input) as JsonValue;
    return ok(data);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown parse error';
    return err(ValidationError.parse(message, e));
  }
};

/**
 * Stringifies a JsonValue to a JSON string
 */
export const stringifyJson = (value: JsonValue, pretty = false): string => {
  return JSON.stringify(value, null, pretty ? 2 : 0);
};

/**
 * Validates a JSON string without parsing
 */
export const validateJsonString = (input: string): Result<void, ValidationError> => {
  if (!input || input.trim().length === 0) {
    return err(ValidationError.empty());
  }

  const size = new Blob([input]).size;
  if (size > MAX_JSON_SIZE) {
    return err(ValidationError.tooLarge(MAX_JSON_SIZE, size));
  }

  try {
    JSON.parse(input);
    return ok(undefined);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown parse error';
    return err(ValidationError.parse(message, e));
  }
};

/**
 * Normalizes JSON by parsing and re-stringifying (removes whitespace)
 */
export const normalizeJson = (input: string): Result<string, ValidationError> => {
  const result = parseJson(input);
  if (!result.ok) {
    return result;
  }
  return ok(stringifyJson(result.value));
};
