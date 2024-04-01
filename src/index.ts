import { isUUID, type AnyJSON } from './utils';
import { v4 as uuid } from '@lukeed/uuid';
import { logger } from 'hono/logger';
import type { Env } from './types';
import { cors } from 'hono/cors';
import { Hono } from 'hono';

const app = new Hono<Env>();

app.use('*', logger());
app.use('*', cors());

app.use('/:id', async (c, next) => {
    const id = c.req.param('id');

    if (!isUUID(id)) {
        return c.json({ success: false, error: 'Invalid webhook bin id' }, 400);
    }

    await next();
});

app.post('/:id', async (c) => {
    const data = await c.req.json<AnyJSON>();

    await c.env.HOOKS.put(
        `${c.req.param('id')}:${uuid()}`,
        JSON.stringify(data),
        { metadata: c.req.header() },
    );

    return c.json({ success: true });
});

app.get('/:id', async (c) => {
    const keys: string[] = [];
    let cursor: string = '';

    while (true) {
        const results = await c.env.HOOKS.list({
            prefix: c.req.param('id'),
            cursor,
        });

        keys.push(...results.keys.map((key) => key.name));

        if (results.list_complete) {
            break;
        }

        cursor = results.cursor;
    }

    const hooks: { data: AnyJSON; headers: AnyJSON }[] = [];

    for (const key of keys) {
        const data = await c.env.HOOKS.getWithMetadata<AnyJSON, AnyJSON>(
            key,
            'json',
        );

        hooks.push({ data: data.value, headers: data.metadata });
    }

    return c.json(hooks);
});

export default app;
