import type { Result } from '../../domain/types/result';

/**
 * Storage error types
 */
export type StorageError =
  | { type: 'not-found'; key: string }
  | { type: 'quota-exceeded'; key: string }
  | { type: 'parse-error'; key: string; message: string }
  | { type: 'unknown'; message: string };

/**
 * Port interface for storage operations
 */
export interface StoragePort {
  /**
   * Saves data to storage
   */
  save<T>(key: string, data: T): Promise<Result<void, StorageError>>;

  /**
   * Loads data from storage
   */
  load<T>(key: string): Promise<Result<T | null, StorageError>>;

  /**
   * Removes data from storage
   */
  remove(key: string): Promise<Result<void, StorageError>>;

  /**
   * Checks if a key exists in storage
   */
  has(key: string): Promise<Result<boolean, StorageError>>;

  /**
   * Lists all keys in storage
   */
  keys(): Promise<Result<readonly string[], StorageError>>;

  /**
   * Clears all data from storage
   */
  clear(): Promise<Result<void, StorageError>>;
}
