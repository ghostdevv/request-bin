import type { Env, RequestEntry, AnyJSON } from './types';
import { v4 as uuid } from '@lukeed/uuid';
import { logger } from 'hono/logger';
import { isUUID } from './utils';
import { cors } from 'hono/cors';
import { Hono } from 'hono';

const app = new Hono<Env>();

app.use('*', logger());
app.use('*', cors());

app.get('/new', (c) => {
	return c.redirect(`/${uuid()}`);
});

app.use('/:id', async (c, next) => {
	const id = c.req.param('id');

	if (!isUUID(id)) {
		return c.json({ success: false, error: 'Invalid webhook bin id' }, 400);
	}

	await next();
});

app.get('/:id', async (c) => {
	const results: RequestEntry[] = [];
	let cursor: string | undefined;

	while (true) {
		const list = await c.env.DATA.list({
			prefix: c.req.param('id'),
			cursor,
		});

		for (const key of list.keys) {
			const data = await c.env.DATA.get<RequestEntry>(key.name, 'json');
			if (data) results.push(data);
		}

		if (list.list_complete) {
			break;
		}

		cursor = list.cursor;
	}

	results.sort((a, b) => b.timestamp - a.timestamp);

	return c.json(results);
});

app.all('/:id', async (c) => {
	const entry: RequestEntry = {
		id: uuid(),
		method: c.req.method.toUpperCase(),
		data: await c.req.json<AnyJSON>(),
		headers: c.req.header(),
		timestamp: Date.now(),
	};

	await c.env.DATA.put(
		`${c.req.param('id')}:${entry.id}`,
		JSON.stringify(entry),
		{ expirationTtl: 604800 },
	);

	return c.json({ success: true, id: entry.id });
});

export default app;
