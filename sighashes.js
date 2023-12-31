#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const c = require('chalk');
const { FunctionFragment } = require('ethers');

function sighash(base, sighashes) {
    let output = fs.readFileSync(path.join(base, 'output.jsonc'), 'utf8');
    output = output.replace(/^\/\/(sol|json)\n/, '');
    const { contracts } = JSON.parse(output);

    for (const file in contracts) {
        for (const contract in contracts[file]) {
            const { abi } = contracts[file][contract];
            const fns = abi.filter(m => m.type === 'function').map(m => FunctionFragment.from(m).format('sighash'));
            for (const fn of fns) {
                sighashes.add(fn);
            }
        }
    }
}

function main() {
    const config = require('./.config.js');
    const sighashes = new Set();

    for (const prefix of fs.readdirSync(config.contracts)) {
        process.stdout.write(`${prefix}`);
        process.stdout.write(parseInt(prefix, 16) % 16 === 15 ? '\n' : c.dim(' | '));

        for (const hash of fs.readdirSync(`${config.contracts}/${prefix}`)) {
            try {
                sighash(`${config.contracts}/${prefix}/${hash}`, sighashes);
            } catch (err) {
            }
        }
    }

    const arr = Array.from(sighashes);
    arr.sort();

    fs.writeFileSync('sighashes.json', JSON.stringify(arr, null, 2));
}

main();
