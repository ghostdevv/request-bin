import type { Env as HonoEnv } from 'hono';

//? Hono env config
export interface Env extends HonoEnv {
	Bindings: {
		DATA: KVNamespace;
	};
}

export interface RequestEntry {
	id: string;
	method: string;
	data: AnyJSON;
	headers: Record<string, string>;
	timestamp: number;
}

export type AnyJSON =
	| string
	| number
	| boolean
	| null
	| { [key: string | number | symbol]: AnyJSON }
	| any[];
