const { loadWire } = require('../support/ws-wire.cjs');
const welcome = require('../../fixtures/contracts/v1/ws-welcome.json');
const arbitrage = require('../../fixtures/contracts/v1/ws-arbitrage.json');

const normaliseDates = value => {
	if (Array.isArray(value)) return value.map(normaliseDates);
	if (!value || typeof value !== 'object') return value;
	return Object.fromEntries(
		Object.entries(value).map(([key, child]) => {
			if (key !== 'date') return [key, normaliseDates(child)];
			expect(child).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
			return [key, '2024-01-02T03:04:05.000Z'];
		})
	);
};

test('native HTTP upgrade executes real origin acceptance and shared welcome bytes', async () => {
	const app = await loadWire();
	const consumer = await app.open();
	expect(await consumer.next()).toEqual(welcome);
	expect(app.server.connections).toHaveLength(1);
});
test('native disallowed origin is actually rejected with HTTP 403', async () => {
	const app = await loadWire();
	await expect(app.open('http://wrong-origin.invalid')).rejects.toThrow(/403/);
	expect(app.server.connections).toHaveLength(0);
});
test('real handler, exchange parser, DTO/calculation and service serialize the shared arbitrage response', async () => {
	const app = await loadWire();
	const consumer = await app.open();
	await consumer.next();
	const timer = await consumer.subscribe({ channel: 'arbitrage', ticker: 'BTC-USDT' });
	expect(timer.delay).toBe(1000);
	await app.feed();
	app.planSave('Arbitrage');
	const response = consumer.next();
	await app.clock.run(timer);
	expect(normaliseDates(await response)).toEqual(arbitrage);
	expect(app.saved).toHaveLength(1);
	expect(app.saved[0].document.profitPercentage).toBe(36);
});
test('lowercase ticker is echoed while actual pair keys and financial transactions are uppercase', async () => {
	const app = await loadWire();
	const consumer = await app.open();
	await consumer.next();
	const timer = await consumer.subscribe({ channel: 'arbitrage', ticker: 'btc-usdt' });
	await app.feed();
	app.planSave('Arbitrage');
	const response = consumer.next();
	await app.clock.run(timer);
	expect(normaliseDates(await response)).toEqual({ ...arbitrage, ticker: 'btc-usdt' });
});
test('native malformed JSON produces actual validation messages instead of a provider stub', async () => {
	const app = await loadWire();
	const consumer = await app.open();
	await consumer.next();
	consumer.socket.sendUTF('not json');
	expect(await consumer.next()).toEqual([
		expect.stringMatching(/^invalid json:/),
		'invalid request: channel and ticker fields are mandatory',
	]);
	expect(app.transport.clients).toHaveLength(0);
});
test('native binary messages are ignored without JSON parsing or feed startup', async () => {
	const app = await loadWire();
	const consumer = await app.open();
	await consumer.next();
	const observed = consumer.observedMessage();
	consumer.socket.sendBytes(Buffer.from('not json'));
	await observed;
	expect(app.transport.clients).toHaveLength(0);
	expect([...app.clock.intervals.keys()].filter(timer => timer.delay === 1000)).toEqual([]);
});
test('Markets without ticker works on wire and its leaked interval is reported before owned cleanup', async () => {
	const app = await loadWire();
	const consumer = await app.open();
	await consumer.next();
	const timer = await consumer.subscribe({ channel: 'Markets' });
	const response = consumer.next();
	await app.clock.run(timer);
	expect(await response).toEqual({
		channel: 'markets',
		markets: { connectedMarkets: [], disconnectedMarkets: [] },
	});
	const closed = new Promise(resolve => {
		app.server.connections[0].once('close', resolve);
	});
	consumer.socket.close();
	await closed;
	expect(app.clock.intervals.has(timer)).toBe(true);
});
test('same native browser subscription duplicates intervals and closes no exchange connection', async () => {
	const app = await loadWire();
	const consumer = await app.open();
	await consumer.next();
	const first = await consumer.subscribe({ channel: 'arbitrage', ticker: 'BTC-USDT' });
	const second = await consumer.subscribe({ channel: 'arbitrage', ticker: 'BTC-USDT' });
	expect(first).not.toBe(second);
	expect(app.clock.intervals.size).toBe(2);
	expect(app.transport.clients).toHaveLength(3);
	const closed = new Promise(resolve => {
		app.server.connections[0].once('close', resolve);
	});
	consumer.socket.close();
	await closed;
	expect([...app.clock.intervals.keys()]).toEqual([first]);
	expect(app.transport.clients.every(client => client.abort.mock.calls.length === 0)).toBe(true);
});
test('best per quote uses real services and save triggers through native serialization', async () => {
	const app = await loadWire();
	const consumer = await app.open();
	await consumer.next();
	const timer = await consumer.subscribe({ channel: 'bestArbitrage', ticker: 'all' });
	await app.feed();
	app.planSave('Arbitrage');
	app.planSave('Arbitrage');
	const response = consumer.next();
	await app.clock.run(timer);
	const frame = await response;
	expect([frame.channel, frame.ticker]).toEqual(['bestArbitrage', 'ALL']);
	expect(
		frame.bestArbitrages.arbitragesData.map(record => [
			record.arbitrage.transactions[0].pair,
			record.arbitrage.profitPerUnit,
			record.arbitrage.profitPercentage,
		])
	).toEqual([
		['BTC-USDT', 45, 36],
		['ETH-USD', 20, 20],
	]);
});
test('channel replacement and independent native clients preserve exact per-client intervals', async () => {
	const app = await loadWire();
	const first = await app.open();
	const second = await app.open();
	await first.next();
	await second.next();
	const one = await first.subscribe({ channel: 'arbitrage', ticker: 'BTC-USDT' });
	const two = await second.subscribe({ channel: 'arbitrage', ticker: 'ETH-USD' });
	const markets = await first.subscribe({ channel: 'Markets' });
	expect(app.clock.intervals.has(one)).toBe(false);
	expect([...app.clock.intervals.keys()]).toEqual([two, markets]);
});
