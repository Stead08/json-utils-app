/**
 * Result type for functional error handling
 * Represents either a successful result with a value or an error
 */
export type Result<T, E> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };

/**
 * Creates a successful result
 */
export const ok = <T, E>(value: T): Result<T, E> => ({
  ok: true,
  value,
});

/**
 * Creates an error result
 */
export const err = <T, E>(error: E): Result<T, E> => ({
  ok: false,
  error,
});

/**
 * Maps a Result's value using a function
 */
export const map = <T, E, U>(
  result: Result<T, E>,
  fn: (value: T) => U
): Result<U, E> => {
  if (result.ok) {
    return ok(fn(result.value));
  }
  return result;
};

/**
 * FlatMaps a Result's value using a function that returns a Result
 */
export const flatMap = <T, E, U>(
  result: Result<T, E>,
  fn: (value: T) => Result<U, E>
): Result<U, E> => {
  if (result.ok) {
    return fn(result.value);
  }
  return result;
};

/**
 * Unwraps a Result, throwing if it's an error
 */
export const unwrap = <T, E>(result: Result<T, E>): T => {
  if (result.ok) {
    return result.value;
  }
  throw new Error(`Unwrap called on error result: ${JSON.stringify(result.error)}`);
};

/**
 * Unwraps a Result or returns a default value
 */
export const unwrapOr = <T, E>(result: Result<T, E>, defaultValue: T): T => {
  if (result.ok) {
    return result.value;
  }
  return defaultValue;
};

/**
 * Checks if a Result is ok
 */
export const isOk = <T, E>(result: Result<T, E>): result is { ok: true; value: T } => {
  return result.ok;
};

/**
 * Checks if a Result is an error
 */
export const isErr = <T, E>(result: Result<T, E>): result is { ok: false; error: E } => {
  return !result.ok;
};
