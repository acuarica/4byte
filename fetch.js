#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const c = require('chalk');

async function download(version) {
    const path = `./.solc/soljson-${version}.js`;

    if (!fs.existsSync(path)) {
        const resp = await fetch(`https://binaries.soliditylang.org/bin/soljson-${version}.js`);
        if (resp.ok) {
            fs.writeFileSync(path, await resp.text());
            process.stdout.write(c.yellow('fetch'));
        } else {
            console.info(c.red(`${resp.status}  ${resp.statusText}`));
            return;
        }
    } else {
        process.stdout.write(c.yellow('cached'));
    }

    console.info(c.green(' \u2713'));
}

async function main() {
    const DS = './smart-contract-fiesta/organized_contracts';

    fs.mkdirSync('./.solc', { recursive: true });
    const versions = new Map();

    console.info('Collecting solc version info...');
    console.info('Prefixes');

    for (const prefix of fs.readdirSync(DS)) {

        process.stdout.write(`${prefix} ${parseInt(prefix, 16) % 8 === 7 ? '\n' : c.dim(' | ')}`);

        for (const hash of fs.readdirSync(`${DS}/${prefix}`)) {
            const base = `${DS}/${prefix}/${hash}`;
            const metadata = JSON.parse(fs.readFileSync(path.join(base, 'metadata.json'), 'utf8'));
            const version = metadata.CompilerVersion;
            const count = versions.get(version) ?? 0;
            versions.set(version, count + 1);
        }
    }

    console.info('Total', c.bold('solc'), 'Versions:', c.blue(versions.size));

    console.info('Fetching versions...');
    for (const [version, count] of versions.entries()) {
        process.stdout.write(`Fetching solc ${c.cyan(version)} ${c.magenta(count + ' contracts')}... `);
        await download(version);
    }
}

main().catch(err => console.error(err));
