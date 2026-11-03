const test = require('node:test');
const assert = require('node:assert/strict');
const { flows, selectFlows, validateControl } = require('./bridge-protocol.cjs');

const token = 'a'.repeat(64);
const request = () => ({ version: 1, id: 'b'.repeat(32), token, action: 'status', args: {} });
test('INT flow selection is explicit, ordered and does not silently skip unknown cases', () => {
	assert.deepEqual(selectFlows('all'), flows);
	assert.deepEqual(selectFlows('arbitrage,rest'), ['rest', 'arbitrage']);
	['', 'missing', 'rest,rest', 'rest,', undefined].forEach(value =>
		assert.throws(() => selectFlows(value), /flow selection/)
	);
});
test('INT control accepts only the owned versioned request shape', () => {
	const value = request();
	assert.equal(validateControl(value, token), value);
});
[
	{ token: 'c'.repeat(64) },
	{ id: '../unowned-file' },
	{ action: 'arbitrary-provider-method' },
	{ args: [] },
	{ version: '1' },
	{ extra: 'unrecognised' },
].forEach(change => {
	test(`INT control rejects ${Object.keys(change)[0]} drift before dispatch`, () => {
		assert.throws(() => validateControl({ ...request(), ...change }, token), /non-owned/);
	});
});
