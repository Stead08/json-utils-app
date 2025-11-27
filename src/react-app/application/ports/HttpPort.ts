import type { Result } from '../../domain/types/result';
import type { JsonValue } from '../../domain/types/json';

/**
 * HTTP error types
 */
export type HttpError =
  | { type: 'network'; message: string }
  | { type: 'timeout'; message: string }
  | { type: 'not-found'; url: string }
  | { type: 'unauthorized'; url: string }
  | { type: 'server-error'; status: number; message: string }
  | { type: 'parse-error'; message: string }
  | { type: 'unknown'; message: string };

/**
 * HTTP request options
 */
export interface HttpRequestOptions {
  readonly method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  readonly headers?: Record<string, string>;
  readonly body?: unknown;
  readonly timeout?: number;
}

/**
 * HTTP response
 */
export interface HttpResponse<T> {
  readonly data: T;
  readonly status: number;
  readonly headers: Record<string, string>;
}

/**
 * Port interface for HTTP operations
 */
export interface HttpPort {
  /**
   * Fetches JSON from a URL
   */
  fetchJson(url: string, options?: HttpRequestOptions): Promise<Result<JsonValue, HttpError>>;

  /**
   * Posts JSON to a URL
   */
  postJson<T>(
    url: string,
    data: unknown,
    options?: HttpRequestOptions
  ): Promise<Result<T, HttpError>>;

  /**
   * Generic request method
   */
  request<T>(
    url: string,
    options?: HttpRequestOptions
  ): Promise<Result<HttpResponse<T>, HttpError>>;
}
