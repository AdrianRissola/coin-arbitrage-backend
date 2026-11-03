const test = require('node:test');
const assert = require('node:assert/strict');
const { acceptedFrontend } = require('./run.cjs');

const valid = () => ({
	success: true,
	scope: 'integration',
	transportMode: 'real-loopback',
	openHandleCount: 0,
	openHandlesMeasured: true,
	requiredFlows: ['rest'],
	completedFlows: ['rest'],
	stages: [
		{
			success: true,
			childCode: 0,
			signal: null,
			timedOut: false,
			totalTests: 2,
			passedTests: 2,
			skippedTests: 0,
			failedTests: 0,
		},
	],
});
test('INT refuses assertion passes with actual Jest open-handle diagnostics', () => {
	assert.equal(acceptedFrontend({ ...valid(), openHandleCount: 3 }), false);
});
test('INT accepts the actual clean, nonempty, unskipped consumer shape', () => {
	assert.equal(acceptedFrontend(valid()), true);
});
test('INT rejects a requested UI flow without actual completion evidence', () => {
	assert.equal(
		acceptedFrontend({ ...valid(), requiredFlows: ['best'], completedFlows: ['arbitrage'] }),
		false
	);
});
test('INT rejects empty diagnostics unless open handles were actually measured', () => {
	assert.deepEqual(
		[undefined, false].map(openHandlesMeasured =>
			acceptedFrontend({ ...valid(), openHandlesMeasured })
		),
		[false, false]
	);
});
