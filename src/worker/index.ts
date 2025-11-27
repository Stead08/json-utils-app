import { Hono } from 'hono';
import { healthRoutes } from './routes/health';
import { shareRoutes } from './routes/share';
import { fetchJsonRoutes } from './routes/fetch-json';

const app = new Hono<{ Bindings: Env }>();

// Mount routes
app.route('/api/health', healthRoutes);
app.route('/api/share', shareRoutes);
app.route('/api/fetch-json', fetchJsonRoutes);

// Legacy route for backwards compatibility
app.get('/api/', (c) => c.json({ name: 'JSON Diff API', version: '1.0.0' }));

export default app;
