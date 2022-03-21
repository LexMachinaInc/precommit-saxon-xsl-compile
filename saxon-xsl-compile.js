import { readFile } from 'fs/promises';
const util = require('util');
const execFile = util.promisify(require('child_process').execFile);

const xslTargets = process.argv.slice(2);

const compileStylesheet = async (stylesheet) => {
    const sefName = stylesheet;
    let existingSef;
    try {
        existingSef = await readFile(sefName);
    } catch (err) {
        existingSef = undefined;
    }

    const { stdout, stderr } = await execFile(
        'xslt3',
        [
            `-xsl:${stylesheet}`,
            `-export:${sefName}`,
            '-nogo',
            '-ns:##html5',
        ]
    );

    try {
        const newSef = await readFile(sefName);

        return {
            success: true,
            changed: newSef != existingSef,
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
process.exit(results.filter(result => !!!result.success || result.changed) ? 1 : 0);
