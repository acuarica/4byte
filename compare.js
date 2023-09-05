#!/usr/bin/env node

const assert = require('assert');

const c = {
	mag: text => `\x1b[35m${text}\x1b[0m`,
	cyan: text => `\x1b[36m${text}\x1b[0m`,
};

async function open(url) {
	console.info('Open', c.cyan(url));
	return new Set(await (await fetch(url)).json());
}

async function main() {
	const x = await open('https://raw.githubusercontent.com/acuarica/evm/main/selectors/functions.json');
	const y = await open('https://raw.githubusercontent.com/acuarica/4byte/main/sighashes.json');

	console.info('functions', x.size, ' -- ', 'sighashes', y.size);

	const u = new Set([...x, ...y]);
	console.info(c.mag('Union'), u.size);

	const i = new Set([...x].filter(i => y.has(i)));
	console.info(c.mag('Intersection'), i.size);

	const dx = new Set([...x].filter(i => !y.has(i)));
	console.info('functions \\ sighashes', dx.size);

	const dy = new Set([...y].filter(i => !x.has(i)));
	console.info('sighashes \\ functions', dy.size);

	assert(dx.size + i.size === x.size);
	assert(dy.size + i.size === y.size);

	assert(u.size - dx.size === y.size);
	assert(u.size - dy.size === x.size);
}

main().catch(console.error);
