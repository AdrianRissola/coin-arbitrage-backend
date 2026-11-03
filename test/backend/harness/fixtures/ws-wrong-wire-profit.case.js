const { loadWire } = require('../../support/ws-wire.cjs');

test('wrong independent expected profit for actual provider bytes', async () => {
	const app = await loadWire();
	const consumer = await app.open();
	await consumer.next();
	const timer = await consumer.subscribe({ channel: 'arbitrage', ticker: 'BTC-USDT' });
	await app.feed();
	app.planSave('Arbitrage');
	const response = consumer.next();
	await app.clock.run(timer);
	expect((await response).arbitrages['BTC-USDT']['Alpha-Gamma'].profitPerUnit).toBe(44);
});
