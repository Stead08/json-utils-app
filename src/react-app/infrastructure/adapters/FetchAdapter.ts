import type { HttpPort, HttpError, HttpRequestOptions, HttpResponse } from '../../application/ports/HttpPort';
import type { Result } from '../../domain/types/result';
import { ok, err } from '../../domain/types/result';
import type { JsonValue } from '../../domain/types/json';

/**
 * Fetch adapter implementation
 */
export class FetchAdapter implements HttpPort {
  constructor(private readonly baseUrl: string = '') {}

  async fetchJson(url: string, options?: HttpRequestOptions): Promise<Result<JsonValue, HttpError>> {
    const result = await this.request<JsonValue>(url, {
      ...options,
      method: options?.method ?? 'GET',
    });

    if (!result.ok) {
      return result;
    }

    return ok(result.value.data);
  }

  async postJson<T>(
    url: string,
    data: unknown,
    options?: HttpRequestOptions
  ): Promise<Result<T, HttpError>> {
    const result = await this.request<T>(url, {
      ...options,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      body: data,
    });

    if (!result.ok) {
      return result;
    }

    return ok(result.value.data);
  }

  async request<T>(
    url: string,
    options?: HttpRequestOptions
  ): Promise<Result<HttpResponse<T>, HttpError>> {
    const fullUrl = this.resolveUrl(url);
    const timeout = options?.timeout ?? 30000;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(fullUrl, {
        method: options?.method ?? 'GET',
        headers: options?.headers,
        body: options?.body ? JSON.stringify(options.body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 404) {
          return err({ type: 'not-found', url: fullUrl });
        }
        if (response.status === 401 || response.status === 403) {
          return err({ type: 'unauthorized', url: fullUrl });
        }
        if (response.status >= 500) {
          return err({
            type: 'server-error',
            status: response.status,
            message: response.statusText,
          });
        }
      }

      const data = await response.json() as T;

      const headers: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        headers[key] = value;
      });

      return ok({
        data,
        status: response.status,
        headers,
      });
    } catch (e) {
      if (e instanceof Error) {
        if (e.name === 'AbortError') {
          return err({ type: 'timeout', message: 'Request timed out' });
        }
        if (e.message.includes('JSON')) {
          return err({ type: 'parse-error', message: e.message });
        }
        return err({ type: 'network', message: e.message });
      }
      return err({ type: 'unknown', message: 'Unknown error occurred' });
    }
  }

  private resolveUrl(url: string): string {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    return `${this.baseUrl}${url}`;
  }
}
