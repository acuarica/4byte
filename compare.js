#!/usr/bin/env node

const assert = require('assert');
const { readFileSync } = require('fs');

const c = {
	mag: text => `\x1b[35m${text}\x1b[0m`,
	cyan: text => `\x1b[36m${text}\x1b[0m`,
};

async function open(url) {
  const arr = url.startsWith('https://')
    ? await (await fetch(url)).json()
    : JSON.parse(readFileSync('./sighashes.json', 'utf-8'));
	console.info('Open', c.cyan(url), arr.length, 'entries');
	return new Set(arr);
}

async function main() {
	const x = await open('https://raw.githubusercontent.com/acuarica/sevm-4byte/main/data/functions.json');
	const y = await open('./sighashes.json');

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
