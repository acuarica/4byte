#!/usr/bin/env node

const { readFileSync } = require('fs');

async function open(url) {
	const arr = url.startsWith('https://')
		? await (await fetch(url)).json()
		: JSON.parse(readFileSync(url, 'utf-8'));
	console.error('Open', url, arr.length, 'entries');
	return new Set(arr);
}

async function main() {
	const x = await open('https://raw.githubusercontent.com/acuarica/evm/main/scripts/4byte/functions.json');
    const y = await open('./sighashes.json');

    const u = new Set([...x, ...y]);

    console.log(JSON.stringify([...u], null, 4));
}

main().catch(console.error);
