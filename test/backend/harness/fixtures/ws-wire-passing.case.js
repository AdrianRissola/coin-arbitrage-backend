const { loadWire } = require('../../support/ws-wire.cjs');
const welcome = require('../../../fixtures/contracts/v1/ws-welcome.json');

test('actual native upgrade and shared welcome', async () => {
	const app = await loadWire();
	const consumer = await app.open();
	expect(await consumer.next()).toEqual(welcome);
});
