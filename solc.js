#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const c = require('chalk');
const byteSize = require('byte-size');

const formath = hash => hash.slice(0, 4) + '..' + hash.slice(60);
const formatv = ver => ver.replace('commit.', '');

function compile(hash, base, version, solc) {
    const metadata = JSON.parse(fs.readFileSync(path.join(base, 'metadata.json'), 'utf8'));
    if (metadata.CompilerVersion !== version) {
        throw new Error(`Version mismatch: ${metadata.CompilerVersion} != ${version}`);
    }

    process.stdout.write(`${c.magenta(hash)} ${c.cyan(metadata.ContractName)} ${formatv(metadata.CompilerVersion)} ${c.dim('|')} `);

    let output = undefined;
    try {
        output = fs.readFileSync(path.join(base, 'output.jsonc'), 'utf8');
    } catch (err) { }

    if (output) {
        const m = output.match(/^\/\/(sol|json)\n/);
        output = output.slice(m[0].length);
        output = JSON.parse(output);
        const sym = m[1];
        if (sym && output && output.contracts) {
            console.info(c.dim(`${c.green(sym + '\u2713')}`));
            return;
        }
    }

    const tries = [
        ['sol', () => JSON.stringify({
            language: 'Solidity',
            sources: {
                'main.sol': {
                    content: fs.readFileSync(path.join(base, 'main.sol'), 'utf8'),
                },
            },
            settings: {
                outputSelection: {
                    '*': {
                        '*': ['abi'],
                    },
                },
            },
        })],
        ['json', () => fs.readFileSync(path.join(base, 'contract.json'), 'utf8')],
    ];

    // const { outputSelection } = JSON.parse(input).settings;
    // for (const file in outputSelection) {
    //     for (const contract in outputSelection[file]) {
    //         const outputTypes = outputSelection[file][contract];
    //         if (!outputTypes.includes('abi')) {
    //             process.stdout.write(c.dim(`${file}:${contract}:${outputTypes.join(',')}`));
    //         }
    //     }
    // }

    for (const [sym, tryFn] of tries) {
        try {
            const input = tryFn();

            process.stdout.write(`${c.green(sym)} ${byteSize(input.length)} `);

            const output = solc.compile(input);
            fs.writeFileSync(path.join(base, `output.jsonc`), `//${sym}\n${output}`);

            process.stdout.write(`${c.green('\u2713')}`);
            break;
        } catch (err) {
            process.stdout.write(`${c.red(c.strikethrough(sym))} `);
        }
    }

    console.info();
}

function main() {
    const info = (message, ...optionalParams) => console.info(c.dim('[info]'), message, ...optionalParams);

    const config = require('./.config.js');

    const version = process.argv[2];
    const solc = function () {
        const path = `./.solc/${version}.js`;
        info('Loading solc', c.yellow(version));
        try {
            return require('solc').setupMethods(require(path));
        } catch (err) {
            console.error(c.red('Failed to load solc'), err);
            process.exit(1);
        }
    }();
    info(c.blue('solc.version'), solc.version());
    info(c.blue('solc.sermver'), solc.semver());

    const filter = process.argv[3];
    info(c.blue('filter'), filter ?? 'all');

    for (const base of JSON.parse(fs.readFileSync(path.join('.solc', version + '.hashes.json')))) {
        const hash = formath(base.slice(3));
        if (!filter || hash.startsWith(filter)) {
            compile(hash, `${config.contracts}/${base}`, version, solc);
        }
    }
}

main();
