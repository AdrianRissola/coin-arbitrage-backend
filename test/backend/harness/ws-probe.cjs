const cp = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');
const assert = require('node:assert/strict');

module.exports = (name, suite = 'offline') => {
	const result = cp.spawnSync(
		process.execPath,
		[path.resolve(__dirname, '../run.cjs'), '--suite', suite, '--probe', name],
		{
			encoding: 'utf8',
			timeout: 45000,
			maxBuffer: 8 * 1024 * 1024,
		}
	);
	const output = (result.stdout || '') + (result.stderr || '');
	const reportPath = result.stdout?.match(/^Report: (.+)$/m)?.[1];
	assert.ok(reportPath, output);
	const resultPath = path.join(path.dirname(reportPath), 'jest-result.json');
	const failures = fs.existsSync(resultPath)
		? JSON.parse(fs.readFileSync(resultPath)).testResults.flatMap(file =>
				file.assertionResults.flatMap(test => test.failureMessages)
		  )
		: [];
	return { ...result, output, failures, report: JSON.parse(fs.readFileSync(reportPath)) };
};
