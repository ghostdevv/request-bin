import { v4 as uuid } from '@lukeed/uuid';
import { logger } from 'hono/logger';
import type { Env } from './types';
import { Hono } from 'hono';

const app = new Hono<Env>();

app.use('*', logger());

app.post('/:id', async (c) => {
    const data = await c.req.json();
    const id = c.req.param('id');

    //todo check id is uuid

    await c.env.HOOKS.put(`${id}:${uuid()}`, JSON.stringify(data), {
        metadata: c.req.header(),
    });

    return c.json({ success: true });
});

app.get('/:id', async (c) => {
    const id = c.req.param('id');

    const keys: string[] = [];
    let cursor: string = '';

    while (true) {
        const results = await c.env.HOOKS.list({
            prefix: id,
            cursor,
        });

        keys.push(...results.keys.map((key) => key.name.split(':')[1]));

        if (results.list_complete) {
            break;
        }

        cursor = results.cursor;
    }

    console.log({ keys });

    const hooks: { data: any; headers: any }[] = [];

    for (const key of keys) {
        const data = await c.env.HOOKS.getWithMetadata(`${id}:${key}`, 'json');
        hooks.push({ data: data.value, headers: data.metadata });
    }

    return c.json(hooks);
});

export default app;
