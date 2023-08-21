#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const c = require('chalk');
const { FunctionFragment } = require('ethers');

function sighash(base, sighashes) {
    const output = fs.readFileSync(path.join(base, 'output.json'), 'utf8');
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

    fs.writeFileSync('sighashes.json', JSON.stringify(Array.from(sighashes), null, 2));
}

main();
