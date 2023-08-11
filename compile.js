#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const c = require('chalk');
const solc = require('solc');

const solcs = {};

const formath = hash => hash.slice(0, 4) + '..' + hash.slice(60);
const formatv = ver => ver.replace('commit.', '');

function load(version) {
    if (solcs[version]) {
        process.stdout.write(c.yellow('M'));
        return solcs[version];
    }

    const path = `./.solc/soljson-${version}.js`;
    process.stdout.write(c.yellow('F'));
    solcs[version] = solc.setupMethods(require(path));

    return solcs[version];
}

function compile(hash, base) {
    const metadata = JSON.parse(fs.readFileSync(path.join(base, 'metadata.json'), 'utf8'));
    process.stdout.write(`${c.magenta(formath(hash))} ${c.cyan(metadata.ContractName)} ${formatv(metadata.CompilerVersion)} ${c.dim('|')}`);

    try {
        const sym = fs.readFileSync(path.join(base, 'sym.txt'), 'utf8');
        const output = JSON.parse(fs.readFileSync(path.join(base, 'output.json'), 'utf8'));
        if (sym && output && output.contracts) {
            console.info(c.dim(` DONE ${c.green(sym + ' \u2713')}`));
            return;
        }
    } catch (err) {
    }

    const tries = [
        [function () {
            const { compile } = load(metadata.CompilerVersion);
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
        [function () {
            const { compile } = load(metadata.CompilerVersion);
            const input = fs.readFileSync(path.join(base, 'contract.json'), 'utf8');
            return compile(input);
        }, 'json'],
        // [() => fs.readFileSync(path.join(base, 'main.vy'), 'utf8'), 'vy'],
    ];

    for (const [tryFn, sym] of tries) {
        try {
            const output = tryFn();
            fs.writeFileSync(path.join(base, `sym.txt`), sym);
            fs.writeFileSync(path.join(base, `output.json`), output);

            process.stdout.write(`${c.green(sym + ' \u2713')} `);
            break;
        } catch (err) {
            process.stdout.write(`${c.red(c.strikethrough(sym))} `);
        }
    }

    console.info();
}

function main() {
    const DS = './smart-contract-fiesta/organized_contracts';

    let prefixes = fs.readdirSync(DS);
    if (process.argv.length >= 4) {
        prefixes = prefixes.filter(p => process.argv.slice(3).includes(p));
    }
    for (const prefix of prefixes) {
        for (const hash of fs.readdirSync(`${DS}/${prefix}`)) {
            compile(hash, `${DS}/${prefix}/${hash}`);
        }
    }
}

main();
