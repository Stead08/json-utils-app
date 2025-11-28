import { Hono } from "hono";

export const fetchJsonRoutes = new Hono<{ Bindings: Env }>();

/**
 * Fetch JSON request
 */
interface FetchJsonRequest {
	url: string;
	headers?: Record<string, string>;
}

/**
 * POST /api/fetch-json - Fetch JSON from external URL (CORS bypass)
 */
fetchJsonRoutes.post("/", async (c) => {
	try {
		const body = await c.req.json<FetchJsonRequest>();

		// Validate URL
		if (!body.url) {
			return c.json({ error: "url is required" }, 400);
		}

		// Validate URL format
		let targetUrl: URL;
		try {
			targetUrl = new URL(body.url);
		} catch {
			return c.json({ error: "Invalid URL format" }, 400);
		}

		// Only allow HTTP/HTTPS
		if (!["http:", "https:"].includes(targetUrl.protocol)) {
			return c.json({ error: "Only HTTP/HTTPS URLs are allowed" }, 400);
		}

		// Fetch from external URL
		const response = await fetch(body.url, {
			method: "GET",
			headers: {
				Accept: "application/json",
				...body.headers,
			},
		});

		if (!response.ok) {
			const errorResponse = {
				error: `Failed to fetch URL: ${response.status} ${response.statusText}`,
			};

			// Use appropriate status code based on response
			if (response.status >= 400 && response.status < 500) {
				return c.json(errorResponse, 400);
			}
			return c.json(errorResponse, 500);
		}

		// Parse JSON
		const data = await response.json();

		// Get content type and size
		const contentType =
			response.headers.get("content-type") || "application/json";
		const size = parseInt(response.headers.get("content-length") || "0", 10);

		return c.json({
			data,
			contentType,
			size,
		});
	} catch (error) {
		console.error("Error fetching JSON:", error);
		const message = error instanceof Error ? error.message : "Unknown error";
		return c.json({ error: `Failed to fetch JSON: ${message}` }, 500);
	}
});
