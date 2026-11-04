const { makePersistence, opportunity } = require('../support/persistence.cjs');

const context = makePersistence();
let service;
beforeAll(async () => {
	await context.Arbitrage.create([
		{
			_id: '000000000000000000000101',
			...opportunity(10, 'BTC-USDT', 'HistoryA', 'HistoryB', '2024-01-01T00:00:00.000Z'),
		},
		{
			_id: '000000000000000000000102',
			...opportunity(20, 'BTC-USDT', 'HistoryA', 'HistoryB', '2024-01-03T00:00:00.000Z'),
		},
		{
			_id: '000000000000000000000103',
			...opportunity(15, 'ETH-USD', 'HistoryA', 'HistoryB', '2024-01-02T00:00:00.000Z'),
		},
	]);
	service = jest.requireActual('../../../service/arbitrageService');
});
test('historical ticker query actually filters and sorts descending MongoDB dates', async () => {
	expect(
		(await service.getByTickerOrderByDateDesc(['BTC-USDT'])).map(record => record.id)
	).toEqual(['000000000000000000000102', '000000000000000000000101']);
});
test('multi-ticker history interleaves literal dates and an empty selection returns no rows', async () => {
	expect(
		(await service.getByTickerOrderByDateDesc(['BTC-USDT', 'ETH-USD'])).map(record => record.id)
	).toEqual(['000000000000000000000102', '000000000000000000000103', '000000000000000000000101']);
	expect(await service.getByTickerOrderByDateDesc([])).toEqual([]);
});
test('actual Mongoose query casting accepts a scalar ticker for the service $in condition', async () => {
	expect((await service.getByTickerOrderByDateDesc('ETH-USD')).map(record => record.id)).toEqual([
		'000000000000000000000103',
	]);
});
test('first/better/equal/worse decisions are based on the actual persisted maximum percentage', async () => {
	const first = await service.saveMaxProfitArbitrageByTicker(opportunity(10));
	const better = await service.saveMaxProfitArbitrageByTicker(
		opportunity(20, 'BTC-USDT', 'RecordBuy', 'RecordSell', '2024-01-03T00:00:00.000Z')
	);
	expect([first.profitPercentage, better.profitPercentage]).toEqual([10, 20]);
	expect(
		await service.saveMaxProfitArbitrageByTicker(
			opportunity(20, 'BTC-USDT', 'RecordBuy', 'RecordSell', '2024-01-04T00:00:00.000Z')
		)
	).toBeNull();
	expect(
		await service.saveMaxProfitArbitrageByTicker(
			opportunity(5, 'BTC-USDT', 'RecordBuy', 'RecordSell', '2024-01-05T00:00:00.000Z')
		)
	).toBeNull();
	expect(
		(
			await context.Arbitrage.find({ 'transactions.0.market': 'RecordBuy' }).sort({
				profitPercentage: -1,
			})
		).map(record => record.profitPercentage)
	).toEqual([20, 10]);
});
test('ticker and ordered buy/sell identity separate actual stored record opportunities', async () => {
	const ticker = await service.saveMaxProfitArbitrageByTicker(opportunity(12, 'ETH-USD'));
	const reverse = await service.saveMaxProfitArbitrageByTicker(
		opportunity(8, 'BTC-USDT', 'RecordSell', 'RecordBuy')
	);
	expect([ticker.transactions[0].pair, reverse.transactions[0].market]).toEqual([
		'ETH-USD',
		'RecordSell',
	]);
	expect(
		await context.Arbitrage.countDocuments({
			'transactions.0.market': 'RecordBuy',
			'transactions.0.pair': 'ETH-USD',
		})
	).toBe(1);
});
test('controlled server find fault rejects the actual service query without inventing a returned value', async () => {
	await context.failNext(['find'], 12345);
	await expect(service.saveMaxProfitArbitrageByTicker(opportunity(30))).rejects.toMatchObject({
		name: 'MongoServerError',
		code: 12345,
	});
});
test('controlled server insert fault rejects without persisting a row', async () => {
	const log = jest.spyOn(console, 'error').mockImplementation(() => {});
	await context.failNext(['insert'], 121);
	await expect(
		service.saveMaxProfitArbitrageByTicker(opportunity(10, 'BTC-USDT', 'FaultBuy', 'FaultSell'))
	).rejects.toMatchObject({ name: 'MongoServerError', code: 121 });
	expect(log.mock.calls[0][0]).toMatchObject({ name: 'MongoServerError', code: 121 });
	expect(await context.Arbitrage.countDocuments({ 'transactions.0.market': 'FaultBuy' })).toBe(0);
});
