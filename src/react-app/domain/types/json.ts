/**
 * Represents any valid JSON value
 */
export type JsonValue =
	| null
	| boolean
	| number
	| string
	| JsonArray
	| JsonObject;

/**
 * Represents a JSON array
 */
export type JsonArray = readonly JsonValue[];

/**
 * Represents a JSON object
 */
export type JsonObject = { readonly [key: string]: JsonValue };

/**
 * Represents a JSON primitive value
 */
export type JsonPrimitive = null | boolean | number | string;

/**
 * Type guard to check if a value is a JSON object
 */
export const isJsonObject = (value: JsonValue): value is JsonObject => {
	return value !== null && typeof value === "object" && !Array.isArray(value);
};

/**
 * Type guard to check if a value is a JSON array
 */
export const isJsonArray = (value: JsonValue): value is JsonArray => {
	return Array.isArray(value);
};

/**
 * Type guard to check if a value is a JSON primitive
 */
export const isJsonPrimitive = (value: JsonValue): value is JsonPrimitive => {
	return value === null || typeof value !== "object";
};
