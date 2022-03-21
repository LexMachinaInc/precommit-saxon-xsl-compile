#!/usr/bin/env node

import { readFile, writeFile, unlink } from 'fs/promises';
import { promisify } from 'util';
import { execFile as syncExecFile } from 'child_process';
import { basename } from 'path';
import { tmpdir } from 'os';
const execFile = promisify(syncExecFile);

const xslTargets = process.argv.slice(2);

const compareSef = (existingSef, newSef) => {
    const parsedExisting = JSON.parse(existingSef);
    const parsedNewSef = JSON.parse(newSef);

    parsedExisting.buildDateTime = undefined;
    parsedNewSef.buildDateTime = undefined;
    parsedExisting.Σ = undefined;
    parsedNewSef.Σ = undefined

    return JSON.stringify(parsedExisting) != JSON.stringify(parsedNewSef);
}

const compileStylesheet = async (stylesheet) => {
    const sefName = stylesheet.replace('.xsl', '.sef.json');
    const baseSefName = basename(sefName);
    const tempSef = tmpdir() + '/' + baseSefName;

    let existingSef;
    try {
        existingSef = await readFile(sefName);
    } catch (err) {
        existingSef = undefined;
    }

    const { stdout, stderr } = await execFile(
        'node',
        [
            process.argv[1].replace('saxon-xsl-compile', '') + '../lib/node_modules/precommit-saxon-xsl-compile/node_modules/xslt3',
            `-xsl:${stylesheet}`,
            `-export:${tempSef}`,
            '-nogo',
            '-ns:##html5',
        ]
    );

    try {
        const newSef = await readFile(tempSef);

        if (!!!existingSef || compareSef(existingSef, newSef)) {
            await writeFile(sefName, newSef);
            await unlink(tempSef);

            await execFile(
                'git',
                [
                    'add',
                    '-N',
                    sefName
                ]
            );

            return {
                success: true,
                changed: true,
                stdout: stdout
            }
        }

        await unlink(tempSef);
        return {
            success: true,
            changed: false,
            stdout: stdout
        };
    } catch (err) {
        return {
            success: false,
            stdout: stdout,
            stderr: stderr
        };
    }
};

const results = await Promise.all(xslTargets.map(compileStylesheet));
process.exit(results.filter(result => !!!result.success || result.changed).length > 0 ? 1 : 0);
