#!/usr/bin/env node

const fs = require('fs');
const c = require('chalk');
const { fork } = require('child_process');
const Listr = require('listr');
const { Observable } = require('rxjs');

const formatv = ver => ver.replace('commit.', '');

function main() {
    const solcs = fs.readdirSync('.solc')
        .filter(file => file.endsWith('.js'))
        .map(file => file.slice(0, -3))
        .map(version => ({ version, count: fs.readFileSync(`.solc/${version}.hashes.json`, 'utf-8').split('\n').length - 2 }));
    solcs.forEach(v => console.info(`Queueing compilation for ${c.cyan(v.version)} ${c.magenta(v.count + ' contract hashes')}...`));
    solcs.sort((lhs, rhs) => rhs.count - lhs.count);

    const queues = Array.from({ length: 8 }, () => []);
    const counts = queues.map(() => 0);
    for (let i = 0; i < solcs.length; i++) {
        let q = 0;
        for (let j = 1; j < queues.length; j++) {
            if (counts[j] < counts[q]) {
                q = j;
            }
        }
        queues[q].push(solcs[i].version);
        counts[q] += solcs[i].count;
    }

    const tasks = queues.map((queue, q) => ({
        title: 'Compiling queue ' + q + '...',
        task: () => new Observable(async observer => {
            for (const version of queue) {
                await new Promise((resolve, reject) => {
                    observer.next(version);
                    const child = fork('./solc.js', [version], { silent: true });
                    child.on('exit', code => resolve({ version, code }));
                    child.on('error', reject);

                    let lineCount = 0;
                    let currentLine = '';
                    child.stdout.on('data', data => {
                        currentLine += `${data}`;
                        const lines = `${currentLine}`.split('\n');
                        currentLine = lines.pop();

                        lineCount += lines.length;
                        observer.next(`${formatv(version)}(${lineCount} contracts) ${currentLine}`);
                    });
                });
            }

            observer.complete();
        })
    }));

    new Listr(tasks, { concurrent: true }).run().catch(err => {
        console.error(err);
    });

}

main();
