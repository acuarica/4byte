#!/usr/bin/env node

const fs = require('fs');
const c = require('chalk');

function main() {
    const config = require('./.config.js');

    let total = 0;
    for (const prefix of fs.readdirSync(config.contracts)) {
        const count = fs.readdirSync(`${config.contracts}/${prefix}`).length;
        total += count;
        process.stdout.write(`${prefix} ${c.magenta(count)}`);
        process.stdout.write(parseInt(prefix, 16) % 8 === 7 ? '\n' : c.dim(' | '));
    }

    console.info('Total Bytecode Hashes:', c.blue(total));
}

main();
