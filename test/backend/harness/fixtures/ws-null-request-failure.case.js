const { loadWire } = require('../../support/ws-wire.cjs');

test('native invalid JSON requests receive errors and leave the connection usable', async () => {
	const app = await loadWire();
	const consumer = await app.open();
	await consumer.next();
	await [
		null,
		[],
		true,
		3,
		'arbitrage',
		{},
		{ ticker: 'BTC-USDT' },
		{ channel: 42, ticker: 'BTC-USDT' },
		{ channel: 'arbitrage' },
		{ channel: 'arbitrage', ticker: 42 },
		{ channel: 'bestArbitrage', ticker: '   ' },
		{ channel: 'Markets', ticker: [] },
	].reduce(
		(previous, payload) =>
			previous.then(async () => {
				consumer.socket.sendUTF(JSON.stringify(payload));
				expect(await consumer.next()).toEqual([
					'invalid request: channel and ticker fields are mandatory',
				]);
				expect(app.transport.clients).toHaveLength(0);
				expect(app.clock.intervals.size).toBe(0);
				expect(consumer.socket.connected).toBe(true);
			}),
		Promise.resolve()
	);
	consumer.socket.sendUTF('not json');
	expect(await consumer.next()).toEqual([
		expect.stringMatching(/^invalid json:/),
		'invalid request: channel and ticker fields are mandatory',
	]);
	const timer = await consumer.subscribe({ channel: 'Markets' });
	await app.clock.run(timer);
	expect(await consumer.next()).toEqual({
		channel: 'markets',
		markets: { connectedMarkets: [], disconnectedMarkets: [] },
	});
	expect(app.transport.clients).toHaveLength(0);
});
