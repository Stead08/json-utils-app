import type { JsonValue, JsonObject, JsonArray } from "../types/json";
import { isJsonObject, isJsonArray, isJsonPrimitive } from "../types/json";
import type { DiffEntry, CompareSettings } from "../types/diff";

/**
 * Computes the diff between two JSON values
 */
export const computeDiff = (
	left: JsonValue,
	right: JsonValue,
	settings: CompareSettings,
	path: readonly string[] = [],
): readonly DiffEntry[] => {
	// Handle null/undefined equivalence
	if (settings.treatNullAsUndefined) {
		if (
			(left === null || left === undefined) &&
			(right === null || right === undefined)
		) {
			return [createUnchangedEntry(path, left, right)];
		}
	}

	// Handle primitives
	if (isJsonPrimitive(left) && isJsonPrimitive(right)) {
		return comparePrimitives(left, right, settings, path);
	}

	// Handle type mismatch
	if (
		typeof left !== typeof right ||
		Array.isArray(left) !== Array.isArray(right)
	) {
		return [createModifiedEntry(path, left, right)];
	}

	// Handle objects
	if (isJsonObject(left) && isJsonObject(right)) {
		return compareObjects(left, right, settings, path);
	}

	// Handle arrays
	if (isJsonArray(left) && isJsonArray(right)) {
		return compareArrays(left, right, settings, path);
	}

	// Fallback: treat as modified
	return [createModifiedEntry(path, left, right)];
};

/**
 * Compares two primitive values
 */
const comparePrimitives = (
	left: JsonValue,
	right: JsonValue,
	settings: CompareSettings,
	path: readonly string[],
): readonly DiffEntry[] => {
	// Handle float tolerance
	if (
		typeof left === "number" &&
		typeof right === "number" &&
		settings.floatTolerance !== undefined
	) {
		if (Math.abs(left - right) <= settings.floatTolerance) {
			return [createUnchangedEntry(path, left, right)];
		}
	}

	// Strict equality
	if (left === right) {
		return [createUnchangedEntry(path, left, right)];
	}

	return [createModifiedEntry(path, left, right)];
};

/**
 * Compares two JSON objects
 */
const compareObjects = (
	left: JsonObject,
	right: JsonObject,
	settings: CompareSettings,
	path: readonly string[],
): readonly DiffEntry[] => {
	const entries: DiffEntry[] = [];
	const allKeys = new Set([...Object.keys(left), ...Object.keys(right)]);

	for (const key of allKeys) {
		const leftValue = left[key];
		const rightValue = right[key];
		const newPath = [...path, key];

		if (!(key in left)) {
			// Key only in right (added)
			entries.push(createAddedEntry(newPath, rightValue));
		} else if (!(key in right)) {
			// Key only in left (removed)
			entries.push(createRemovedEntry(newPath, leftValue));
		} else {
			// Key in both, recurse
			entries.push(...computeDiff(leftValue, rightValue, settings, newPath));
		}
	}

	return entries;
};

/**
 * Compares two JSON arrays
 */
const compareArrays = (
	left: JsonArray,
	right: JsonArray,
	settings: CompareSettings,
	path: readonly string[],
): readonly DiffEntry[] => {
	if (settings.ignoreArrayOrder && settings.keyField) {
		return compareArraysByKey(left, right, settings, path);
	}

	if (settings.ignoreArrayOrder) {
		return compareArraysUnordered(left, right, settings, path);
	}

	return compareArraysOrdered(left, right, settings, path);
};

/**
 * Compares arrays in order (index-based)
 */
const compareArraysOrdered = (
	left: JsonArray,
	right: JsonArray,
	settings: CompareSettings,
	path: readonly string[],
): readonly DiffEntry[] => {
	const entries: DiffEntry[] = [];
	const maxLength = Math.max(left.length, right.length);

	for (let i = 0; i < maxLength; i++) {
		const newPath = [...path, String(i)];

		if (i >= left.length) {
			// Item only in right (added)
			entries.push(createAddedEntry(newPath, right[i]));
		} else if (i >= right.length) {
			// Item only in left (removed)
			entries.push(createRemovedEntry(newPath, left[i]));
		} else {
			// Both present, recurse
			entries.push(...computeDiff(left[i], right[i], settings, newPath));
		}
	}

	return entries;
};

/**
 * Compares arrays ignoring order (set-based comparison)
 */
const compareArraysUnordered = (
	left: JsonArray,
	right: JsonArray,
	settings: CompareSettings,
	path: readonly string[],
): readonly DiffEntry[] => {
	const entries: DiffEntry[] = [];
	const rightCopy = [...right];

	// For each left item, try to find a match in right
	for (let i = 0; i < left.length; i++) {
		const leftItem = left[i];
		const matchIndex = rightCopy.findIndex((rightItem) =>
			areValuesEqual(leftItem, rightItem, settings),
		);

		if (matchIndex === -1) {
			// No match found, item removed
			entries.push(createRemovedEntry([...path, String(i)], leftItem));
		} else {
			// Match found, remove from rightCopy and mark as unchanged
			rightCopy.splice(matchIndex, 1);
			entries.push(
				createUnchangedEntry([...path, String(i)], leftItem, leftItem),
			);
		}
	}

	// Remaining items in rightCopy are added
	for (const rightItem of rightCopy) {
		entries.push(
			createAddedEntry([...path, String(right.indexOf(rightItem))], rightItem),
		);
	}

	return entries;
};

/**
 * Compares arrays by a key field
 */
const compareArraysByKey = (
	left: JsonArray,
	right: JsonArray,
	settings: CompareSettings,
	path: readonly string[],
): readonly DiffEntry[] => {
	if (!settings.keyField) {
		return compareArraysUnordered(left, right, settings, path);
	}

	const entries: DiffEntry[] = [];
	const keyField = settings.keyField;

	// Create maps by key
	const leftMap = new Map<string, JsonValue>();
	const rightMap = new Map<string, JsonValue>();

	for (const item of left) {
		if (isJsonObject(item) && keyField in item) {
			leftMap.set(String(item[keyField]), item);
		}
	}

	for (const item of right) {
		if (isJsonObject(item) && keyField in item) {
			rightMap.set(String(item[keyField]), item);
		}
	}

	// Compare by key
	const allKeys = new Set([...leftMap.keys(), ...rightMap.keys()]);

	for (const key of allKeys) {
		const leftItem = leftMap.get(key);
		const rightItem = rightMap.get(key);
		const newPath = [...path, key];

		if (!leftItem && rightItem) {
			entries.push(createAddedEntry(newPath, rightItem));
		} else if (leftItem && !rightItem) {
			entries.push(createRemovedEntry(newPath, leftItem));
		} else if (leftItem && rightItem) {
			entries.push(...computeDiff(leftItem, rightItem, settings, newPath));
		}
	}

	return entries;
};

/**
 * Checks if two values are equal according to settings
 */
const areValuesEqual = (
	left: JsonValue,
	right: JsonValue,
	settings: CompareSettings,
): boolean => {
	if (settings.treatNullAsUndefined) {
		if (
			(left === null || left === undefined) &&
			(right === null || right === undefined)
		) {
			return true;
		}
	}

	if (
		typeof left === "number" &&
		typeof right === "number" &&
		settings.floatTolerance !== undefined
	) {
		return Math.abs(left - right) <= settings.floatTolerance;
	}

	return JSON.stringify(left) === JSON.stringify(right);
};

/**
 * Creates an added entry
 */
const createAddedEntry = (
	path: readonly string[],
	value: JsonValue,
): DiffEntry => ({
	type: "added",
	path,
	rightValue: value,
});

/**
 * Creates a removed entry
 */
const createRemovedEntry = (
	path: readonly string[],
	value: JsonValue,
): DiffEntry => ({
	type: "removed",
	path,
	leftValue: value,
});

/**
 * Creates a modified entry
 */
const createModifiedEntry = (
	path: readonly string[],
	leftValue: JsonValue,
	rightValue: JsonValue,
): DiffEntry => ({
	type: "modified",
	path,
	leftValue,
	rightValue,
});

/**
 * Creates an unchanged entry
 */
const createUnchangedEntry = (
	path: readonly string[],
	leftValue: JsonValue,
	rightValue: JsonValue,
): DiffEntry => ({
	type: "unchanged",
	path,
	leftValue,
	rightValue,
});
