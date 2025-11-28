import type { Result } from "../../domain/types/result";
import { err } from "../../domain/types/result";
import type { ExportFormat } from "../../domain/types/diff";
import type { DiffResult } from "../../domain/entities/DiffResult";
import { formatDiff } from "../../domain/functions/formatter";
import type { ExportPort, ExportError } from "../ports/ExportPort";

/**
 * Input for exporting diff
 */
export interface ExportDiffInput {
	readonly diffResult: DiffResult;
	readonly format: ExportFormat;
	readonly filename?: string;
}

/**
 * Use case for exporting diff results
 */
export const createExportDiffUseCase = (exportPort: ExportPort) => {
	return async (input: ExportDiffInput): Promise<Result<void, ExportError>> => {
		try {
			// Format the diff
			const formatted = formatDiff(input.diffResult.toObject(), input.format);

			// Determine filename
			const filename =
				input.filename ??
				`diff-${Date.now()}.${getFileExtension(input.format)}`;

			// Determine MIME type
			const mimeType = getMimeType(input.format);

			// Download the file
			return await exportPort.downloadAsFile(formatted, filename, mimeType);
		} catch (e) {
			const message = e instanceof Error ? e.message : "Unknown error";
			return err({ type: "unknown", message });
		}
	};
};

/**
 * Use case for copying diff to clipboard
 */
export const createCopyDiffUseCase = (exportPort: ExportPort) => {
	return async (
		diffResult: DiffResult,
		format: ExportFormat,
	): Promise<Result<void, ExportError>> => {
		try {
			const formatted = formatDiff(diffResult.toObject(), format);
			return await exportPort.copyToClipboard(formatted);
		} catch (e) {
			const message = e instanceof Error ? e.message : "Unknown error";
			return err({ type: "unknown", message });
		}
	};
};

/**
 * Gets file extension for export format
 */
const getFileExtension = (format: ExportFormat): string => {
	switch (format) {
		case "json":
			return "json";
		case "markdown":
			return "md";
		case "html":
			return "html";
		case "json-patch":
			return "json";
		default:
			return "txt";
	}
};

/**
 * Gets MIME type for export format
 */
const getMimeType = (format: ExportFormat): string => {
	switch (format) {
		case "json":
			return "application/json";
		case "markdown":
			return "text/markdown";
		case "html":
			return "text/html";
		case "json-patch":
			return "application/json-patch+json";
		default:
			return "text/plain";
	}
};
