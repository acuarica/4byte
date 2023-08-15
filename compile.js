#!/usr/bin/env node

const fs = require('fs');
const c = require('chalk');
const { fork } = require('child_process');

async function main() {
    const jss = fs.readdirSync('.solc');
    for (const file of jss) {
        if (!file.endsWith('.js')) {
            continue;
        }

        const version = file.slice(0, -3);
        console.info(`Compiling using ${c.cyan(version)}...`);
        const exitCode = await new Promise((resolve, reject) => {
            const child = fork('./solc.js', [version]);
            child.on('exit', code => resolve(code));
            child.on('error', reject);
        });
        console.info(`${c.magenta(exitCode)}...`);
    }
}

main().catch(err => console.error(err));
