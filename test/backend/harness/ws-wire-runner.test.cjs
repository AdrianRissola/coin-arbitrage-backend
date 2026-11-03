const test = require('node:test');
const assert = require('node:assert/strict');
const probe = require('./ws-probe.cjs');

test('wire runner performs an actual native upgrade and exits naturally', () => {
	const result = probe('ws-wire-passing', 'websocket-wire');
	assert.equal(result.status, 0, result.output);
	assert.equal(result.report.stages[0].passedTests, 1);
	assert.equal(result.report.success, true);
});
test('a wrong independent financial oracle fails against the real serialized provider message', () => {
	const result = probe('ws-wrong-wire-profit', 'websocket-wire');
	assert.equal(result.status, 1, result.output);
	assert.equal(result.report.stages[0].timedOut, false);
	assert.ok(
		result.failures.some(
			failure => failure.includes('Expected: 44') && failure.includes('Received: 45')
		),
		result.output
	);
	assert.ok(!result.output.includes('BE_TEST_GUARD_BLOCKED'), result.output);
});
test('native invalid requests are rejected without failing the runner or losing the connection', () => {
	const result = probe('ws-null-request-failure', 'websocket-wire');
	assert.equal(result.status, 0, result.output);
	assert.equal(result.report.stages[0].childCode, 0, result.output);
	assert.equal(result.report.stages[0].timedOut, false);
	assert.equal(result.report.stages[0].passedTests, 1);
	assert.equal(result.report.success, true);
	assert.equal(result.failures.length, 0, result.output);
	assert.ok(!result.output.includes('BE_TEST_GUARD_BLOCKED'), result.output);
});
