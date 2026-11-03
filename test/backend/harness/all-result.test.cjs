const test = require('node:test');
const assert = require('node:assert/strict');
const { profileAccepted } = require('../all.cjs');

const result = { childCode: 0, signal: null };
const report = () => ({
	version: 1,
	scope: 'offline',
	success: true,
	stages: [{ success: true, totalTests: 1, passedTests: 1, timedOut: false, signal: null }],
});
test('aggregate accepts actual nonempty successful profile metadata', () => {
	assert.equal(profileAccepted('offline', result, report()), true);
});
test('aggregate rejects a missing child report despite exit zero', () => {
	assert.equal(profileAccepted('offline', result, null), false);
});
test('aggregate rejects a report for the wrong selected profile', () => {
	assert.equal(profileAccepted('api', result, report()), false);
});
test('aggregate rejects a nonzero child even when its report claims success', () => {
	assert.equal(profileAccepted('offline', { ...result, childCode: 1 }, report()), false);
});
test('aggregate rejects zero-execution and timed-out stages', () => {
	const data = report();
	data.stages[0].passedTests = 0;
	assert.equal(profileAccepted('offline', result, data), false);
	data.stages[0].passedTests = 1;
	data.stages[0].timedOut = true;
	assert.equal(profileAccepted('offline', result, data), false);
	data.stages[0].timedOut = false;
	data.stages[0].totalTests = '1';
	assert.equal(profileAccepted('offline', result, data), false);
});
test('aggregate rejects signalled children with otherwise positive metadata', () => {
	assert.equal(profileAccepted('offline', { ...result, signal: 'SIGTERM' }, report()), false);
});
test('MongoDB aggregate success requires affirmative creation/readiness/cleanup proof', () => {
	const data = {
		...report(),
		scope: 'persistence',
		persistence: { created: true, ready: true, removed: false },
	};
	assert.equal(profileAccepted('persistence', result, data), false);
	data.persistence.removed = 'false';
	assert.equal(profileAccepted('persistence', result, data), false);
	data.persistence.removed = true;
	assert.equal(profileAccepted('persistence', result, data), true);
});
