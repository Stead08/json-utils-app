import type { JsonValue } from "../types/json";
import { ValidationError } from "../value-objects/ValidationError";
import type { Result } from "../types/result";
import { ok, err } from "../types/result";

/**
 * Entity representing a JSON document
 */
export class JsonDocument {
	constructor(
		private readonly id: string,
		private readonly data: JsonValue,
		private readonly metadata: {
			readonly createdAt: Date;
			readonly size: number;
		},
	) {}

	/**
	 * Creates a JsonDocument from a string
	 */
	static fromString(
		input: string,
		id?: string,
	): Result<JsonDocument, ValidationError> {
		// Check if empty
		if (!input || input.trim().length === 0) {
			return err(ValidationError.empty());
		}

		// Parse JSON
		let data: JsonValue;
		try {
			data = JSON.parse(input);
		} catch (e) {
			const message = e instanceof Error ? e.message : "Unknown parse error";
			return err(ValidationError.parse(message, e));
		}

		// Create metadata
		const metadata = {
			createdAt: new Date(),
			size: new Blob([input]).size,
		};

		// Generate ID if not provided
		const documentId = id ?? crypto.randomUUID();

		return ok(new JsonDocument(documentId, data, metadata));
	}

	/**
	 * Creates a JsonDocument from a JsonValue
	 */
	static fromValue(data: JsonValue, id?: string): JsonDocument {
		const documentId = id ?? crypto.randomUUID();
		const metadata = {
			createdAt: new Date(),
			size: new Blob([JSON.stringify(data)]).size,
		};

		return new JsonDocument(documentId, data, metadata);
	}

	/**
	 * Returns the document ID
	 */
	getId(): string {
		return this.id;
	}

	/**
	 * Returns the document data
	 */
	getData(): JsonValue {
		return this.data;
	}

	/**
	 * Returns the document metadata
	 */
	getMetadata() {
		return this.metadata;
	}

	/**
	 * Returns the document as a JSON string
	 */
	toString(pretty = false): string {
		return JSON.stringify(this.data, null, pretty ? 2 : 0);
	}

	/**
	 * Returns the size of the document in bytes
	 */
	getSize(): number {
		return this.metadata.size;
	}

	/**
	 * Returns the creation timestamp
	 */
	getCreatedAt(): Date {
		return this.metadata.createdAt;
	}
}
