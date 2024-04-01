import { isUUID, type AnyJSON } from './utils';
import { v4 as uuid } from '@lukeed/uuid';
import { logger } from 'hono/logger';
import type { Env } from './types';
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

app.post('/:id', async (c) => {
	const data = await c.req.json<AnyJSON>();

	await c.env.DATA.put(
		`${c.req.param('id')}:${uuid()}`,
		JSON.stringify(data),
		{ metadata: c.req.header(), expirationTtl: 604800 },
	);

	return c.json({ success: true });
});

app.get('/:id', async (c) => {
	const results: { id: string; data: AnyJSON; headers: AnyJSON }[] = [];
	let cursor: string = '';

	while (true) {
		const list = await c.env.DATA.list<AnyJSON>({
			prefix: c.req.param('id'),
			cursor,
		});

		for (const { name: key, metadata } of list.keys) {
			const data = await c.env.DATA.get<AnyJSON>(key, 'json');

			results.push({
				id: key.split(':')[1],
				data,
				headers: metadata || {},
			});
		}

		if (list.list_complete) {
			break;
		}

		cursor = list.cursor;
	}

	return c.json(results);
});

export default app;
