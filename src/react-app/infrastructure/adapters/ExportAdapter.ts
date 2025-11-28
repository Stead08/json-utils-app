import type {
	ExportPort,
	ExportError,
	ExportOptions,
} from "../../application/ports/ExportPort";
import type { Result } from "../../domain/types/result";
import { ok, err } from "../../domain/types/result";

/**
 * Export adapter implementation for browser
 */
export class ExportAdapter implements ExportPort {
	async exportToFile(
		content: string,
		options: ExportOptions,
	): Promise<Result<void, ExportError>> {
		const filename =
			options.filename ??
			`export-${Date.now()}.${this.getExtension(options.format)}`;
		const mimeType = this.getMimeType(options.format);

		return this.downloadAsFile(content, filename, mimeType);
	}

	async copyToClipboard(content: string): Promise<Result<void, ExportError>> {
		try {
			if (navigator.clipboard) {
				await navigator.clipboard.writeText(content);
				return ok(undefined);
			}

			// Fallback for older browsers
			const textarea = document.createElement("textarea");
			textarea.value = content;
			textarea.style.position = "fixed";
			textarea.style.opacity = "0";
			document.body.appendChild(textarea);
			textarea.select();
			document.execCommand("copy");
			document.body.removeChild(textarea);

			return ok(undefined);
		} catch (e) {
			const message =
				e instanceof Error ? e.message : "Failed to copy to clipboard";
			return err({ type: "unknown", message });
		}
	}

	async downloadAsFile(
		content: string,
		filename: string,
		mimeType: string,
	): Promise<Result<void, ExportError>> {
		try {
			const blob = new Blob([content], { type: mimeType });
			const url = URL.createObjectURL(blob);

			const link = document.createElement("a");
			link.href = url;
			link.download = filename;
			link.style.display = "none";

			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);

			// Clean up the URL object
			setTimeout(() => URL.revokeObjectURL(url), 100);

			return ok(undefined);
		} catch (e) {
			const message =
				e instanceof Error ? e.message : "Failed to download file";
			return err({ type: "file-system-error", message });
		}
	}

	private getExtension(format: string): string {
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
	}

	private getMimeType(format: string): string {
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
	}
}
