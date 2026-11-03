const test = require('node:test');
const assert = require('node:assert/strict');
const cp = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');

const runner = path.resolve(__dirname, '../run.cjs');
const probe = name => {
	const result = cp.spawnSync(process.execPath, [runner, '--suite', 'api', '--probe', name], {
		encoding: 'utf8',
		timeout: 45000,
		maxBuffer: 8 * 1024 * 1024,
	});
	const output = result.stdout + result.stderr;
	const reportPath = result.stdout?.match(/^Report: (.+)$/m)?.[1];
	assert.ok(reportPath, output);
	return { ...result, output, report: JSON.parse(fs.readFileSync(reportPath)) };
};
test('API runner exercises a real leased listener and exits naturally', () => {
	const result = probe('http-passing');
	assert.equal(result.status, 0, result.output);
	assert.equal(result.report.stages[0].passedTests, 1);
	assert.equal(result.report.success, true);
});
test('a wrong HTTP status oracle cannot appear green', () => {
	const result = probe('api-wrong-status');
	assert.equal(result.status, 1, result.output);
	assert.equal(result.report.stages[0].failedTests, 1);
	assert.match(result.output, /expected 201.*got 200/);
});
[
	['api-market-map-failure', /Cannot convert undefined or null to object/, 'marketController'],
	['api-history-failure', /B3 HTTP history query rejected/, 'arbitrageController'],
	['api-current-error', /Cannot set headers after they are sent/, 'arbitrageController'],
].forEach(([name, error, controller]) => {
	test(`${name} requires the existing source-specific async HTTP failure, not a generic timeout`, () => {
		const result = probe(name);
		assert.equal(result.status, 1, result.output);
		assert.equal(result.report.stages[0].childCode, 1, result.output);
		assert.equal(result.report.stages[0].timedOut, false, result.output);
		assert.match(result.output, error);
		assert.ok(result.output.includes(`controller/${controller}.js`), result.output);
		assert.ok(!result.output.includes('BE_TEST_GUARD_BLOCKED'), result.output);
	});
});
