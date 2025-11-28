import { Hono } from "hono";

export const shareRoutes = new Hono<{ Bindings: Env }>();

/**
 * Share data structure
 */
interface ShareData {
	leftJson: string;
	rightJson: string;
	settings?: {
		ignoreArrayOrder?: boolean;
		keyField?: string;
		floatTolerance?: number;
		treatNullAsUndefined?: boolean;
	};
}

/**
 * POST /api/share - Create shareable diff link
 */
shareRoutes.post("/", async (c) => {
	try {
		const body = await c.req.json<ShareData>();

		// Validate input
		if (!body.leftJson || !body.rightJson) {
			return c.json({ error: "leftJson and rightJson are required" }, 400);
		}

		// Generate unique ID
		const id = crypto.randomUUID();

		// Calculate expiration (7 days from now)
		const expiresAt = new Date();
		expiresAt.setDate(expiresAt.getDate() + 7);

		// Store in KV
		const data = {
			id,
			leftJson: body.leftJson,
			rightJson: body.rightJson,
			settings: body.settings,
			createdAt: new Date().toISOString(),
			expiresAt: expiresAt.toISOString(),
		};

		// Store with expiration TTL (7 days in seconds)
		await c.env.JSON_DIFF_KV.put(`share:${id}`, JSON.stringify(data), {
			expirationTtl: 7 * 24 * 60 * 60,
		});

		// Return share URL
		const url = new URL(c.req.url);
		const shareUrl = `${url.origin}/share/${id}`;

		return c.json({
			id,
			url: shareUrl,
			expiresAt: expiresAt.toISOString(),
		});
	} catch (error) {
		console.error("Error creating share:", error);
		return c.json({ error: "Failed to create share" }, 500);
	}
});

/**
 * GET /api/share/:id - Retrieve shared diff data
 */
shareRoutes.get("/:id", async (c) => {
	try {
		const id = c.req.param("id");

		// Retrieve from KV
		const data = await c.env.JSON_DIFF_KV.get(`share:${id}`);

		if (!data) {
			return c.json({ error: "Share not found or expired" }, 404);
		}

		const shareData = JSON.parse(data);

		return c.json(shareData);
	} catch (error) {
		console.error("Error retrieving share:", error);
		return c.json({ error: "Failed to retrieve share" }, 500);
	}
});
