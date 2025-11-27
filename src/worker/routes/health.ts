import { Hono } from 'hono';

export const healthRoutes = new Hono<{ Bindings: Env }>();

/**
 * Health check endpoint
 */
healthRoutes.get('/', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});
