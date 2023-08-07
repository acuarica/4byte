#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { yellow, magenta, cyan, dim, green, red, blue, strikethrough } = require('chalk');
const solc = require('solc');
const { FunctionFragment } = require('ethers');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

const solcs = {};

async function load(version) {
    if (solcs[version]) {
        process.stdout.write(yellow('M'));
        return solcs[version];
    }

    const path = `./.solc/soljson-${version}.js`;

    if (!fs.existsSync(path)) {
        process.stdout.write(yellow('D'));
        const resp = await fetch(`https://binaries.soliditylang.org/bin/soljson-${version}.js`);
        fs.writeFileSync(path, await resp.text());
    }

    if (!solcs[version]) {
        process.stdout.write(yellow('F'));
        solcs[version] = solc.setupMethods(require(path));
    }

    return solcs[version];
}

async function abi(db, hash, output, name, version) {
    process.stdout.write(`ABI from Contract ${magenta(hash)} ${cyan(name)} ${version} ${dim('|')} `);

    const { contracts } = JSON.parse(output);
    process.stdout.write(`${Object.keys(contracts).length} contracts `);

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

async function compile(db, hash, base) {
    const metadata = JSON.parse(fs.readFileSync(path.join(base, 'metadata.json'), 'utf8'));
    process.stdout.write(`Bytecode Hash ${magenta(hash)} ${cyan(metadata.ContractName)} ${metadata.CompilerVersion} ${dim('|')}`);

    await db.run('INSERT INTO contract_hashes(hash, name, version) VALUES (:hash, :name, :version)', {
        ':hash': hash,
        ':name': metadata.ContractName,
        ':version': metadata.CompilerVersion,
    });

    const tries = [
        [async function () {
            const { compile } = await load(metadata.CompilerVersion);
            const content = fs.readFileSync(path.join(base, 'main.sol'), 'utf8');
            const input = {
                language: 'Solidity',
                sources: {
                    'main.sol': {
                        content,
                    },
                },
                settings: {
                    outputSelection: {
                        '*': {
                            '*': ['abi'],
                        },
                    },
                },
            };
            return compile(JSON.stringify(input));
        }, 'sol'],
        [async function () {
            const { compile } = await load(metadata.CompilerVersion);
            const input = fs.readFileSync(path.join(base, 'contract.json'), 'utf8');
            return compile(input);
        }, 'json'],
        // [async () => fs.readFileSync(path.join(base, 'main.vy'), 'utf8'), 'vy'],
    ];

    for (const [tryFn, sym] of tries) {
        try {
            const output = await tryFn();
            await db.run('UPDATE contract_hashes SET source = :source, output = :output WHERE hash = :hash', {
                ':hash': hash,
                ':source': sym,
                ':output': output,
            });

            process.stdout.write(`${green(sym + ' \u2713')} `);
            break;
        } catch (err) {
            process.stdout.write(`${red(strikethrough(sym))} `);
        }
    }

    console.info();
}

async function main() {
    const db = await open({
        filename: 'solc.sqlite',
        driver: sqlite3.Database
    });
    await db.exec('CREATE TABLE IF NOT EXISTS contract_hashes (hash TEXT PRIMARY KEY ON CONFLICT REPLACE, name TEXT NOT NULL, version TEXT NOT NULL, source TEXT, output TEXT) STRICT');
    await db.exec('CREATE TABLE IF NOT EXISTS contract_functions (hash TEXT, name TEXT, version TEXT, file TEXT, contract TEXT, sighash TEXT NOT NULL, PRIMARY KEY (hash, file, sighash) ON CONFLICT REPLACE) STRICT');
    await db.exec('CREATE VIEW IF NOT EXISTS sighashes AS SELECT sighash, COUNT(sighash) AS count FROM contract_functions GROUP BY sighash ORDER BY COUNT(sighash) DESC');
    await db.exec('CREATE VIEW IF NOT EXISTS versions AS SELECT version, COUNT(version) AS count FROM contract_hashes GROUP BY version ORDER BY COUNT(version) DESC');

    const DIR = '../smart-contract-fiesta/organized_contracts';

    const cmd = process.argv[2];
    if (cmd === 'abi') {
        const rows = await db.all('SELECT hash, name, version, source, output FROM contract_hashes');
        for (const row of rows) {
            try {
                await abi(db, row.hash, row.output, row.name, row.version);
                console.info(`${green(' \u2713')}`);
            } catch (err) {
                console.info(`${red(err.message + ' \u2A2F')}`);
            }
        }
    } else if (cmd === 'compile') {
        fs.mkdirSync('./.solc', { recursive: true });
        for (const prefix of fs.readdirSync(DIR)) {
            for (const hash of fs.readdirSync(`${DIR}/${prefix}`)) {
                await compile(db, hash, `${DIR}/${prefix}/${hash}`);
            }
        }
    } else if (cmd === 'stats') {
        let total = 0;
        for (const prefix of fs.readdirSync(DIR)) {
            const count = fs.readdirSync(`${DIR}/${prefix}`).length;
            total += count;
            process.stdout.write(`${prefix} ${magenta(count)}`);
            process.stdout.write(parseInt(prefix, 16) % 8 === 7 ? '\n' : dim(' | '));
        }

        console.info('Total Bytecode Hashes:', blue(total));

    } else {
        console.error(red('Unknown command', cmd));
    }
}

main().catch(err => console.error(err));
