#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const c = require('chalk');

const formath = hash => hash.slice(0, 4) + '..' + hash.slice(60);
const formatv = ver => ver.replace('commit.', '');

function compile(hash, base, version, solc) {
    const metadata = JSON.parse(fs.readFileSync(path.join(base, 'metadata.json'), 'utf8'));
    if (metadata.CompilerVersion !== version) {
        return;
    }

    process.stdout.write(`${c.magenta(formath(hash))} ${c.cyan(metadata.ContractName)} ${formatv(metadata.CompilerVersion)} ${c.dim('|')}`);

    try {
        const sym = fs.readFileSync(path.join(base, 'sym.txt'), 'utf8');
        const output = JSON.parse(fs.readFileSync(path.join(base, 'output.json'), 'utf8'));
        if (sym && output && output.contracts) {
            console.info(c.dim(` ${c.green(sym + '\u2713')}`));
            return;
        }
    } catch (err) {
    }

    const tries = [
        [function () {
            const { compile } = solc;
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
            const { compile } = solc;
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
    const config = require('./.config.js');

    const version = process.argv[2];
    const solc = function () {
        const path = `./.solc/${version}.js`;
        console.info('Loading solc', c.yellow(version));
        try {
            return require('solc').setupMethods(require(path));
        } catch (err) {
            console.error(c.red('Failed to load solc'), err);
            process.exit(1);
        }
    }();
    console.info(c.blue('solc.version'), solc.version());
    console.info(c.blue('solc.sermver'), solc.semver());

    for (const base of JSON.parse(fs.readFileSync(path.join('.solc', version + '.hashes.json')))) {
        const hash = base.slice(3);
        compile(hash, `${config.contracts}/${base}`, version, solc);
    }
}

main();
