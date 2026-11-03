const { once } = require('node:events');
const { loadWire } = require('../../support/ws-wire.cjs');
const welcome = require('../../../fixtures/contracts/v1/ws-welcome.json');

test('actual native upgrade and shared welcome', async () => {
	const app = await loadWire();
	const consumer = await app.open();
	expect(await consumer.next()).toEqual(welcome);
	const provider = app.server.connections[0];
	const closed = once(provider, 'close');
	const listeners = provider.listenerCount('close');
	const closing = app.close();
	try {
		expect(provider.listenerCount('close')).toBeGreaterThan(listeners);
		await closing;
		expect(app.server.connections).toHaveLength(0);
	} finally {
		await Promise.all([closing, closed]);
	}
});
