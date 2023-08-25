#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const c = require('chalk');
const { FunctionFragment } = require('ethers');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

const formath = hash => hash.slice(0, 4) + '..' + hash.slice(60);
const formatv = ver => ver.replace('commit.', '');

async function abi(db, hash, base) {
    const { ContractName: name, CompilerVersion: version } = JSON.parse(fs.readFileSync(path.join(base, 'metadata.json'), 'utf8'));
    process.stdout.write(`${c.magenta(formath(hash))} ${c.cyan(name)} ${formatv(version)} ${c.dim('|')} `);

    const output = fs.readFileSync(path.join(base, 'output.jsonc'), 'utf8');
    const m = output.match(/^\/\/(sol|json)\n/);
    const { contracts } = JSON.parse(output.slice(m[0].length));
    const sym = m[1];

    process.stdout.write(`${Object.keys(contracts).length} contracts `);

    await db.run('INSERT INTO contract_hashes(hash, name, version, source) VALUES (:hash, :name, :version, :source)', {
        ':hash': hash,
        ':name': name,
        ':version': version,
        ':source': sym,
    });

    for (const file in contracts) {
        for (const contract in contracts[file]) {
            const { abi } = contracts[file][contract];
            const fns = abi.filter(m => m.type === 'function').map(m => FunctionFragment.from(m).format('sighash'));
            for (const fn of fns) {
                await db.run('INSERT INTO contract_functions(hash, name, version, file, contract, sighash) VALUES (:hash, :name, :version, :file, :contract, :sighash)', {
                    ':hash': hash,
                    ':name': name,
                    ':version': version,
                    ':file': file,
                    ':contract': contract,
                    ':sighash': fn,
                });
            }
        }
    }
}

async function main() {
    const config = require('./.config.js');

    const db = await open({
        filename: 'abi.sqlite',
        driver: sqlite3.Database
    });
    await db.exec('CREATE TABLE IF NOT EXISTS contract_hashes (hash TEXT PRIMARY KEY ON CONFLICT REPLACE, name TEXT NOT NULL, version TEXT NOT NULL, source TEXT) STRICT');
    await db.exec('CREATE TABLE IF NOT EXISTS contract_functions (hash TEXT, name TEXT, version TEXT, file TEXT, contract TEXT, sighash TEXT NOT NULL, PRIMARY KEY (hash, file, sighash) ON CONFLICT REPLACE) STRICT');
    await db.exec('CREATE VIEW IF NOT EXISTS sighashes AS SELECT sighash, COUNT(sighash) AS count FROM contract_functions GROUP BY sighash ORDER BY COUNT(sighash) DESC');
    await db.exec('CREATE VIEW IF NOT EXISTS versions AS SELECT version, COUNT(version) AS count FROM contract_hashes GROUP BY version ORDER BY COUNT(version) DESC');

    for (const prefix of fs.readdirSync(config.contracts)) {
        for (const hash of fs.readdirSync(`${config.contracts}/${prefix}`)) {
            try {
                await abi(db, hash, `${config.contracts}/${prefix}/${hash}`);
                console.info(`${c.green(' \u2713')}`);
            } catch (err) {
                console.info(`${c.red(err.message + ' \u2A2F')}`);
            }
        }
    }
}

main().catch(err => console.error(err));
