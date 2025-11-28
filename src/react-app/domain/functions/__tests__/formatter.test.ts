import { describe, it, expect } from "vitest";
import { formatJson } from "../formatter";
import type { FormatSettings } from "../../types/diff";

describe("formatJson", () => {
	describe("basic formatting", () => {
		it("should format minified JSON with 2 spaces", () => {
			const input = '{"name":"John","age":30}';
			const settings: FormatSettings = { indent: 2, sortKeys: false };
			const result = formatJson(input, settings);

			expect(result.ok).toBe(true);
			if (result.ok) {
				expect(result.value).toBe('{\n  "name": "John",\n  "age": 30\n}');
			}
		});

		it("should format minified JSON with 4 spaces", () => {
			const input = '{"name":"John","age":30}';
			const settings: FormatSettings = { indent: 4, sortKeys: false };
			const result = formatJson(input, settings);

			expect(result.ok).toBe(true);
			if (result.ok) {
				expect(result.value).toBe('{\n    "name": "John",\n    "age": 30\n}');
			}
		});

		it("should format with tabs when indent is \\t", () => {
			const input = '{"name":"John"}';
			const settings: FormatSettings = { indent: "\t", sortKeys: false };
			const result = formatJson(input, settings);

			expect(result.ok).toBe(true);
			if (result.ok) {
				expect(result.value).toContain("\t");
				expect(result.value).toBe('{\n\t"name": "John"\n}');
			}
		});

		it("should handle already formatted JSON", () => {
			const input = '{\n  "name": "John",\n  "age": 30\n}';
			const settings: FormatSettings = { indent: 2, sortKeys: false };
			const result = formatJson(input, settings);

			expect(result.ok).toBe(true);
			if (result.ok) {
				expect(result.value).toBe('{\n  "name": "John",\n  "age": 30\n}');
			}
		});
	});

	describe("key sorting", () => {
		it("should sort object keys when sortKeys is true", () => {
			const input = '{"z":1,"a":2,"m":3}';
			const settings: FormatSettings = { indent: 2, sortKeys: true };
			const result = formatJson(input, settings);

			expect(result.ok).toBe(true);
			if (result.ok) {
				const parsed = JSON.parse(result.value);
				expect(Object.keys(parsed)).toEqual(["a", "m", "z"]);
			}
		});

		it("should not sort keys when sortKeys is false", () => {
			const input = '{"z":1,"a":2,"m":3}';
			const settings: FormatSettings = { indent: 2, sortKeys: false };
			const result = formatJson(input, settings);

			expect(result.ok).toBe(true);
			if (result.ok) {
				const parsed = JSON.parse(result.value);
				expect(Object.keys(parsed)).toEqual(["z", "a", "m"]);
			}
		});

		it("should sort keys recursively in nested objects", () => {
			const input = '{"z":{"c":1,"a":2},"a":{"z":3,"a":4}}';
			const settings: FormatSettings = { indent: 2, sortKeys: true };
			const result = formatJson(input, settings);

			expect(result.ok).toBe(true);
			if (result.ok) {
				const parsed = JSON.parse(result.value);
				expect(Object.keys(parsed)).toEqual(["a", "z"]);
				expect(Object.keys(parsed.a)).toEqual(["a", "z"]);
				expect(Object.keys(parsed.z)).toEqual(["a", "c"]);
			}
		});

		it("should sort keys in objects within arrays", () => {
			const input = '[{"z":1,"a":2},{"m":3,"b":4}]';
			const settings: FormatSettings = { indent: 2, sortKeys: true };
			const result = formatJson(input, settings);

			expect(result.ok).toBe(true);
			if (result.ok) {
				const parsed = JSON.parse(result.value);
				expect(Object.keys(parsed[0])).toEqual(["a", "z"]);
				expect(Object.keys(parsed[1])).toEqual(["b", "m"]);
			}
		});
	});

	describe("nested structures", () => {
		it("should handle nested objects", () => {
			const input = '{"outer":{"inner":{"deep":"value"}}}';
			const settings: FormatSettings = { indent: 2, sortKeys: false };
			const result = formatJson(input, settings);

			expect(result.ok).toBe(true);
			if (result.ok) {
				const parsed = JSON.parse(result.value);
				expect(parsed.outer.inner.deep).toBe("value");
			}
		});

		it("should handle arrays", () => {
			const input = '{"items":[1,2,3]}';
			const settings: FormatSettings = { indent: 2, sortKeys: false };
			const result = formatJson(input, settings);

			expect(result.ok).toBe(true);
			if (result.ok) {
				expect(result.value).toContain("[\n    1,\n    2,\n    3\n  ]");
			}
		});

		it("should handle mixed nested structures", () => {
			const input =
				'{"users":[{"name":"Alice","scores":[95,87]},{"name":"Bob","scores":[82,91]}]}';
			const settings: FormatSettings = { indent: 2, sortKeys: false };
			const result = formatJson(input, settings);

			expect(result.ok).toBe(true);
			if (result.ok) {
				const parsed = JSON.parse(result.value);
				expect(parsed.users).toHaveLength(2);
				expect(parsed.users[0].scores).toHaveLength(2);
			}
		});
	});

	describe("special values", () => {
		it("should handle null values", () => {
			const input = '{"value":null}';
			const settings: FormatSettings = { indent: 2, sortKeys: false };
			const result = formatJson(input, settings);

			expect(result.ok).toBe(true);
			if (result.ok) {
				expect(result.value).toContain("null");
			}
		});

		it("should handle boolean values", () => {
			const input = '{"active":true,"disabled":false}';
			const settings: FormatSettings = { indent: 2, sortKeys: false };
			const result = formatJson(input, settings);

			expect(result.ok).toBe(true);
			if (result.ok) {
				const parsed = JSON.parse(result.value);
				expect(parsed.active).toBe(true);
				expect(parsed.disabled).toBe(false);
			}
		});

		it("should handle number values", () => {
			const input = '{"integer":42,"float":3.14,"negative":-10}';
			const settings: FormatSettings = { indent: 2, sortKeys: false };
			const result = formatJson(input, settings);

			expect(result.ok).toBe(true);
			if (result.ok) {
				const parsed = JSON.parse(result.value);
				expect(parsed.integer).toBe(42);
				expect(parsed.float).toBe(3.14);
				expect(parsed.negative).toBe(-10);
			}
		});

		it("should handle empty objects and arrays", () => {
			const input = '{"emptyObj":{},"emptyArr":[]}';
			const settings: FormatSettings = { indent: 2, sortKeys: false };
			const result = formatJson(input, settings);

			expect(result.ok).toBe(true);
			if (result.ok) {
				const parsed = JSON.parse(result.value);
				expect(parsed.emptyObj).toEqual({});
				expect(parsed.emptyArr).toEqual([]);
			}
		});

		it("should handle strings with special characters", () => {
			const input = '{"text":"Hello\\nWorld","quote":"He said \\"Hi\\""}';
			const settings: FormatSettings = { indent: 2, sortKeys: false };
			const result = formatJson(input, settings);

			expect(result.ok).toBe(true);
			if (result.ok) {
				const parsed = JSON.parse(result.value);
				expect(parsed.text).toBe("Hello\nWorld");
				expect(parsed.quote).toBe('He said "Hi"');
			}
		});
	});

	describe("error handling", () => {
		it("should return error for invalid JSON", () => {
			const input = "{invalid json}";
			const settings: FormatSettings = { indent: 2, sortKeys: false };
			const result = formatJson(input, settings);

			expect(result.ok).toBe(false);
			if (!result.ok) {
				expect(result.error.getType()).toBe("parse");
				expect(result.error.getMessage()).toBeTruthy();
			}
		});

		it("should return error for truncated JSON", () => {
			const input = '{"name":"John"';
			const settings: FormatSettings = { indent: 2, sortKeys: false };
			const result = formatJson(input, settings);

			expect(result.ok).toBe(false);
			if (!result.ok) {
				expect(result.error.getType()).toBe("parse");
			}
		});

		it("should return error for empty string", () => {
			const input = "";
			const settings: FormatSettings = { indent: 2, sortKeys: false };
			const result = formatJson(input, settings);

			expect(result.ok).toBe(false);
			if (!result.ok) {
				expect(result.error.getType()).toBe("parse");
			}
		});

		it("should return error for non-JSON string", () => {
			const input = "just a string";
			const settings: FormatSettings = { indent: 2, sortKeys: false };
			const result = formatJson(input, settings);

			expect(result.ok).toBe(false);
			if (!result.ok) {
				expect(result.error.getType()).toBe("parse");
			}
		});
	});

	describe("integration with different settings combinations", () => {
		it("should format with 2 spaces and sort keys", () => {
			const input = '{"z":1,"a":2}';
			const settings: FormatSettings = { indent: 2, sortKeys: true };
			const result = formatJson(input, settings);

			expect(result.ok).toBe(true);
			if (result.ok) {
				expect(result.value).toBe('{\n  "a": 2,\n  "z": 1\n}');
			}
		});

		it("should format with 4 spaces and sort keys", () => {
			const input = '{"z":1,"a":2}';
			const settings: FormatSettings = { indent: 4, sortKeys: true };
			const result = formatJson(input, settings);

			expect(result.ok).toBe(true);
			if (result.ok) {
				expect(result.value).toBe('{\n    "a": 2,\n    "z": 1\n}');
			}
		});

		it("should format with tabs and sort keys", () => {
			const input = '{"z":1,"a":2}';
			const settings: FormatSettings = { indent: "\t", sortKeys: true };
			const result = formatJson(input, settings);

			expect(result.ok).toBe(true);
			if (result.ok) {
				expect(result.value).toBe('{\n\t"a": 2,\n\t"z": 1\n}');
			}
		});
	});
});
