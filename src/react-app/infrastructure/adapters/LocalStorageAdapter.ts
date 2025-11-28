import type {
	StoragePort,
	StorageError,
} from "../../application/ports/StoragePort";
import type { Result } from "../../domain/types/result";
import { ok, err } from "../../domain/types/result";

/**
 * LocalStorage adapter implementation
 */
export class LocalStorageAdapter implements StoragePort {
	constructor(private readonly keyPrefix: string = "json-diff:") {}

	async save<T>(key: string, data: T): Promise<Result<void, StorageError>> {
		try {
			const prefixedKey = this.getPrefixedKey(key);
			const serialized = JSON.stringify(data);
			localStorage.setItem(prefixedKey, serialized);
			return ok(undefined);
		} catch (e) {
			if (e instanceof Error && e.name === "QuotaExceededError") {
				return err({ type: "quota-exceeded", key });
			}
			const message = e instanceof Error ? e.message : "Unknown error";
			return err({ type: "unknown", message });
		}
	}

	async load<T>(key: string): Promise<Result<T | null, StorageError>> {
		try {
			const prefixedKey = this.getPrefixedKey(key);
			const item = localStorage.getItem(prefixedKey);

			if (item === null) {
				return ok(null);
			}

			const data = JSON.parse(item) as T;
			return ok(data);
		} catch (e) {
			const message = e instanceof Error ? e.message : "Unknown parse error";
			return err({ type: "parse-error", key, message });
		}
	}

	async remove(key: string): Promise<Result<void, StorageError>> {
		try {
			const prefixedKey = this.getPrefixedKey(key);
			localStorage.removeItem(prefixedKey);
			return ok(undefined);
		} catch (e) {
			const message = e instanceof Error ? e.message : "Unknown error";
			return err({ type: "unknown", message });
		}
	}

	async has(key: string): Promise<Result<boolean, StorageError>> {
		try {
			const prefixedKey = this.getPrefixedKey(key);
			const exists = localStorage.getItem(prefixedKey) !== null;
			return ok(exists);
		} catch (e) {
			const message = e instanceof Error ? e.message : "Unknown error";
			return err({ type: "unknown", message });
		}
	}

	async keys(): Promise<Result<readonly string[], StorageError>> {
		try {
			const allKeys: string[] = [];
			for (let i = 0; i < localStorage.length; i++) {
				const key = localStorage.key(i);
				if (key && key.startsWith(this.keyPrefix)) {
					allKeys.push(key.slice(this.keyPrefix.length));
				}
			}
			return ok(allKeys);
		} catch (e) {
			const message = e instanceof Error ? e.message : "Unknown error";
			return err({ type: "unknown", message });
		}
	}

	async clear(): Promise<Result<void, StorageError>> {
		try {
			const keysResult = await this.keys();
			if (!keysResult.ok) {
				return keysResult;
			}

			for (const key of keysResult.value) {
				await this.remove(key);
			}

			return ok(undefined);
		} catch (e) {
			const message = e instanceof Error ? e.message : "Unknown error";
			return err({ type: "unknown", message });
		}
	}

	private getPrefixedKey(key: string): string {
		return `${this.keyPrefix}${key}`;
	}
}
