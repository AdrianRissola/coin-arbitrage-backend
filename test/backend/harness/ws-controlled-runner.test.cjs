const test = require('node:test');
const assert = require('node:assert/strict');
const probe = require('./ws-probe.cjs');

test('a wrong subscription oracle fails against the real exchange client send path', () => {
	const result = probe('ws-wrong-send');
	assert.equal(result.status, 1, result.output);
	assert.equal(result.report.stages[0].failedTests, 1);
	assert.equal(result.report.stages[0].timedOut, false);
	assert.ok(
		result.failures.some(
			failure => failure.includes('ETH-USD') && failure.includes('BTC-USDT')
		),
		result.output
	);
	assert.ok(!result.output.includes('BE_TEST_GUARD_BLOCKED'), result.output);
});
test('async EventEmitter exchange JSON failure reaches Jest with its actual source frame', () => {
	const result = probe('ws-exchange-json-failure');
	assert.equal(result.status, 1, result.output);
	assert.equal(result.report.stages[0].childCode, 1, result.output);
	assert.equal(result.report.stages[0].timedOut, false);
	assert.ok(
		result.failures.some(
			failure => /SyntaxError/.test(failure) && failure.includes('marketWebSocketClient.js')
		),
		result.output
	);
	assert.ok(!result.output.includes('BE_TEST_GUARD_BLOCKED'), result.output);
});
