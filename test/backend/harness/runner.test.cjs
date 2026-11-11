const nodeTest = require('node:test');
const assert = require('node:assert/strict');
const cp = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');

const runner = path.resolve(__dirname, '../run.cjs');
const probe = name => {
	const result = cp.spawnSync(process.execPath, [runner, '--probe', name], {
		encoding: 'utf8',
		timeout: 45000,
	});
	const reportPath = result.stdout?.match(/^Report: (.+)$/m)?.[1];
	assert.ok(reportPath, result.stderr || result.stdout);
	return { ...result, report: JSON.parse(fs.readFileSync(reportPath, 'utf8')) };
};

nodeTest('a passing Jest probe has a nonempty successful result', () => {
	const result = probe('passing');
	assert.equal(result.status, 0, result.stderr);
	assert.equal(result.report.success, true);
	assert.equal(result.report.stages[0].totalTests, 1);
});

nodeTest('a deliberately failing assertion propagates nonzero status', () => {
	const result = probe('failing');
	assert.equal(result.status, 1);
	assert.equal(result.report.success, false);
	assert.equal(result.report.stages[0].failedTests, 1);
});

nodeTest('a discovered file with zero assertions cannot be a passing run', () => {
	const result = probe('empty');
	assert.equal(result.status, 1);
	assert.equal(result.report.success, false);
	assert.equal(result.report.stages[0].totalTests, 0);
	assert.match(result.stdout + result.stderr, /must contain at least one test/);
});

nodeTest('no matching test files return nonzero status', () => {
	const result = probe('no-tests');
	assert.equal(result.status, 1);
	assert.equal(result.report.stages[0].totalTests, 0);
	assert.match(result.stdout + result.stderr, /No tests found/);
});

nodeTest('an all-skipped Jest result cannot be a passing run', () => {
	const result = probe('skipped');
	assert.equal(result.status, 1);
	assert.equal(result.report.stages[0].childCode, 0);
	assert.equal(result.report.stages[0].passedTests, 0);
});

nodeTest('forced exit zero without a Jest result is rejected', () => {
	const result = probe('forced-success');
	assert.equal(result.status, 1);
	assert.equal(result.report.stages[0].childCode, 0);
	assert.equal(result.report.stages[0].reason, 'missing-jest-result');
});

nodeTest('swallowed network violations fail an otherwise passing assertion', () => {
	const result = probe('caught-network');
	assert.equal(result.status, 1);
	assert.equal(result.report.stages[0].failedTests, 1);
});

nodeTest('a wrong independent financial oracle fails against the real calculator', () => {
	const result = probe('financial-oracle');
	assert.equal(result.status, 1);
	assert.equal(result.report.stages[0].failedTests, 1);
	assert.match(result.stdout + result.stderr, /Received: 56\.25/);
});

nodeTest('direct legacy package configuration is blocked before application tests', () => {
	const result = probe('legacy-command');
	assert.equal(result.status, 1);
	assert.match(result.stdout + result.stderr, /Direct legacy Jest invocation is disabled/);
});

[
	['currency-cache-init', 'B2 controlled currency import failure', 'currencyRepository'],
	['market-cache-init', 'B2 controlled market import failure', 'marketRepository'],
	['market-cache-refresh', 'B2 controlled market refresh failure', 'marketRepository'],
].forEach(([name, marker, repository]) => {
	nodeTest(`${name} characterises the existing unhandled repository failure`, () => {
		const result = probe(name);
		const output = result.stdout + result.stderr;
		assert.equal(result.status, 1, output);
		assert.equal(result.report.stages[0].childCode, 1, output);
		assert.ok(output.includes(marker), output);
		assert.ok(output.includes(`repository/${repository}.js`), output);
	});
});
