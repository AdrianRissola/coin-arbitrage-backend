const { makePersistence, opportunity } = require('../support/persistence.cjs');

const context = makePersistence();

test('real Currency insert/read casts flags and strips unknown fields without imposing required fields', async () => {
	const saved = await new context.Currency({
		symbol: 'NEW',
		name: 'New currency',
		quote: 'true',
		base: 0,
		ignored: 'not persisted',
	}).save();
	const read = await context.Currency.findById(saved.id).lean();
	expect({
		symbol: read.symbol,
		name: read.name,
		quote: read.quote,
		base: read.base,
		ignored: read.ignored,
	}).toEqual({
		symbol: 'NEW',
		name: 'New currency',
		quote: true,
		base: false,
		ignored: undefined,
	});
	expect(JSON.parse(JSON.stringify(saved))).toMatchObject({
		_id: expect.stringMatching(/^[a-f0-9]{24}$/),
	});
});
test('optional and duplicate Currency symbols actually persist because no required/unique index exists', async () => {
	await context.Currency.create([{}, { symbol: 'DUPLICATE' }, { symbol: 'DUPLICATE' }]);
	expect(await context.Currency.countDocuments({ symbol: 'DUPLICATE' })).toBe(2);
	expect(await context.Currency.countDocuments({ symbol: { $exists: false } })).toBe(1);
});
test('nested Market configuration makes a real BSON round trip with aliases, paths and templates intact', async () => {
	const document = new context.Market({
		name: 'Nested',
		availableTickersToMarketTickers: { 'ETH-USD': 'XETHZUSD' },
		com: {
			api: {
				websocket: {
					host: 'nested.invalid',
					url: 'wss://nested.invalid',
					tickerRequest: `{"symbol":"\${ticker}"}`,
					tickers: ['ETH-USD'],
					tickerPattern: {
						separator: '/',
						quoteCurrencyFirst: true,
						currencies: [{ symbol: 'ETH', marketSymbol: 'XETH' }],
					},
					pathToPrice: ['data', 1],
					pathToTicker: ['data', 0],
				},
			},
		},
		ignored: 'not persisted',
	});
	await document.save();
	const read = await context.Market.findById(document.id).lean();
	expect(read.availableTickersToMarketTickers['ETH-USD']).toBe('XETHZUSD');
	expect(read.com.api.websocket).toMatchObject({
		tickerRequest: `{"symbol":"\${ticker}"}`,
		tickers: ['ETH-USD'],
		pathToPrice: ['data', 1],
		pathToTicker: ['data', 0],
		tickerPattern: {
			separator: '/',
			quoteCurrencyFirst: true,
			currencies: [{ symbol: 'ETH', marketSymbol: 'XETH' }],
		},
	});
	expect(read.ignored).toBeUndefined();
});
test('Arbitrage nested transaction IDs, literal finances and Date survive actual persistence/JSON', async () => {
	const saved = await new context.Arbitrage(opportunity(10, 'ETH-USD')).save();
	const read = JSON.parse(JSON.stringify(await context.Arbitrage.findById(saved.id)));
	expect([read.profitPerUnit, read.profitPercentage, read.date]).toEqual([
		10,
		10,
		'2024-01-02T03:04:05.000Z',
	]);
	expect(
		read.transactions.map(transaction => [
			transaction.type,
			transaction.market,
			transaction.pair,
			transaction.price,
		])
	).toEqual([
		['BUY', 'RecordBuy', 'ETH-USD', 90],
		['SELL', 'RecordSell', 'ETH-USD', 100],
	]);
	expect(
		read.transactions.every(({ _id: identifier }) => /^[a-f0-9]{24}$/.test(identifier))
	).toBe(true);
});
test('Mongoose casting errors reject actual saves before creating a document', async () => {
	await expect(
		new context.Arbitrage({ ...opportunity(), profitPercentage: 'invalid number' }).save()
	).rejects.toThrow(/validation failed/i);
	expect(await context.Arbitrage.countDocuments()).toBe(1);
});
