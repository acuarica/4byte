#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { yellow, magenta, cyan, dim, green, red, blue, strikethrough } = require('chalk');
const solc = require('solc');
const { FunctionFragment } = require('ethers');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

const solcs = {};

const formath = hash => hash.slice(0, 4) + '..' + hash.slice(60);
const formatv = ver => ver.replace('commit.', '');

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

async function abi(db, hash, base) {
    const { ContractName: name, CompilerVersion: version } = JSON.parse(fs.readFileSync(path.join(base, 'metadata.json'), 'utf8'));
    process.stdout.write(`ABI ${magenta(formath(hash))} ${cyan(name)} ${formatv(version)} ${dim('|')} `);

    const sym = fs.readFileSync(path.join(base, 'sym.txt'), 'utf8');
    const output = fs.readFileSync(path.join(base, 'output.json'), 'utf8');

    const { contracts } = JSON.parse(output);
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

async function compile(hash, base) {
    const metadata = JSON.parse(fs.readFileSync(path.join(base, 'metadata.json'), 'utf8'));
    process.stdout.write(`${magenta(formath(hash))} ${cyan(metadata.ContractName)} ${formatv(metadata.CompilerVersion)} ${dim('|')}`);

    try {
        const sym = fs.readFileSync(path.join(base, 'sym.txt'), 'utf8');
        const output = JSON.parse(fs.readFileSync(path.join(base, 'output.json'), 'utf8'));
        if (sym && output && output.contracts) {
            console.info(dim(` DONE ${green(sym + ' \u2713')}`));
            return;
        }
    } catch (err) {
    }

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
            fs.writeFileSync(path.join(base, `sym.txt`), sym);
            fs.writeFileSync(path.join(base, `output.json`), output);

            process.stdout.write(`${green(sym + ' \u2713')} `);
            break;
        } catch (err) {
            process.stdout.write(`${red(strikethrough(sym))} `);
        }
    }

    console.info();
}

async function main() {
    const DIR = './smart-contract-fiesta/organized_contracts';

    const cmd = process.argv[2];
    if (cmd === 'abi') {
        const db = await open({
            filename: 'solc.sqlite',
            driver: sqlite3.Database
        });
        await db.exec('CREATE TABLE IF NOT EXISTS contract_hashes (hash TEXT PRIMARY KEY ON CONFLICT REPLACE, name TEXT NOT NULL, version TEXT NOT NULL, source TEXT) STRICT');
        await db.exec('CREATE TABLE IF NOT EXISTS contract_functions (hash TEXT, name TEXT, version TEXT, file TEXT, contract TEXT, sighash TEXT NOT NULL, PRIMARY KEY (hash, file, sighash) ON CONFLICT REPLACE) STRICT');
        await db.exec('CREATE VIEW IF NOT EXISTS sighashes AS SELECT sighash, COUNT(sighash) AS count FROM contract_functions GROUP BY sighash ORDER BY COUNT(sighash) DESC');
        await db.exec('CREATE VIEW IF NOT EXISTS versions AS SELECT version, COUNT(version) AS count FROM contract_hashes GROUP BY version ORDER BY COUNT(version) DESC');

        for (const prefix of fs.readdirSync(DIR)) {
            for (const hash of fs.readdirSync(`${DIR}/${prefix}`)) {
                try {
                    await abi(db, hash, `${DIR}/${prefix}/${hash}`);
                    console.info(`${green(' \u2713')}`);
                } catch (err) {
                    console.info(`${red(err.message + ' \u2A2F')}`);
                }
            }
        }
    } else if (cmd === 'compile') {
        fs.mkdirSync('./.solc', { recursive: true });
        let prefixes = fs.readdirSync(DIR);
        if (process.argv.length >= 4) {
            prefixes = prefixes.filter(p => process.argv.slice(3).includes(p));
        }
        for (const prefix of prefixes) {
            for (const hash of fs.readdirSync(`${DIR}/${prefix}`)) {
                await compile(hash, `${DIR}/${prefix}/${hash}`);
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
