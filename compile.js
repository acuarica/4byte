#!/usr/bin/env node

const fs = require('fs');
const c = require('chalk');
const { fork } = require('child_process');
const Listr = require('listr');
const { Observable } = require('rxjs');

function main() {
    const versions = fs.readdirSync('.solc')
        .filter(file => file.endsWith('.js'))
        .map(file => file.slice(0, -3));
    versions.forEach(version => console.info(`Queueing compilation for ${c.cyan(version)}...`));

    const JOBS = 8;
    const queues = Array.from({ length: JOBS }, () => []);
    for (let i = 0; i < versions.length; i++) {
        queues[i % JOBS].push(versions[i]);
    }

    const tasks = Array.from({ length: JOBS }, (_v, q) => {
        return {
            title: 'Compiling queue ' + q + '...',
            task: () => new Observable(async observer => {
                const queue = queues[q];
                for (const version of queue) {
                    await new Promise((resolve, reject) => {
                        let count = 0;
                        observer.next(version);
                        const child = fork('./solc.js', [version], { silent: true });
                        child.on('exit', code => resolve({ version, code }));
                        child.on('error', reject);
                        child.stdout.on('data', data => {
                            const lines = `${data}`.split('\n');
                            count += lines.length;
                            observer.next(`${version} | ${count} contracts | ${lines.pop()}`);
                        });
                    });
                }

                observer.complete();
            })
        };
    });
    new Listr(tasks, { concurrent: true }).run().catch(err => {
        console.error(err);
    });

}

main();
