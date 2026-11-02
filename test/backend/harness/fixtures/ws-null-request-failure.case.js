const { loadWire } = require('../../support/ws-wire.cjs');

test('native null JSON request exposes actual async mandatory-field validation failure', async () => {
	const app = await loadWire();
	const consumer = await app.open();
	await consumer.next();
	const observed = consumer.observedMessage();
	consumer.socket.sendUTF('null');
	await observed;
	await new Promise(resolve => {
		setImmediate(resolve);
	});
	expect(app.transport.clients).toHaveLength(0);
});
