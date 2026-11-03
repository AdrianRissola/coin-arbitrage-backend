const { makePersistence } = require('../support/persistence.cjs');

const context = makePersistence();
beforeAll(async () => {
	context.commands.splice(0);
	await context.loadRepositories();
});
test('Currency initialization actually reads MongoDB into clone-isolated cache and manager state', () => {
	expect(context.currencyRepository.getAll().map(record => record.symbol)).toEqual([
		'USD',
		'BTC',
	]);
	const records = context.currencyRepository.getAll();
	records[0].symbol = 'caller mutation';
	expect(context.currencyRepository.getAll()[0].symbol).toBe('USD');
	expect(context.manager.getAvailableCurrencies().map(record => record.symbol)).toEqual([
		'USD',
		'BTC',
	]);
});
test('Market initialization performs its two real reads and initializes manager state', async () => {
	expect(
		context.commands.filter(
			command => command.name === 'find' && command.collection === 'markets'
		)
	).toHaveLength(2);
	expect((await context.marketRepository.getAll()).map(record => record.name)).toEqual([
		'Alpha',
		'Beta',
	]);
	expect(context.manager.getAllMarkets().map(record => record.name)).toEqual(['Alpha', 'Beta']);
});
test('Currency save reaches MongoDB while its existing cache/manager remain stale', async () => {
	const saved = await context.currencyRepository.save({
		symbol: 'EUR',
		name: 'Euro',
		quote: true,
	});
	expect((await context.Currency.findById(saved.id)).symbol).toBe('EUR');
	expect(context.currencyRepository.getAll().map(record => record.symbol)).toEqual([
		'USD',
		'BTC',
	]);
	expect(context.manager.getAvailableCurrencies().map(record => record.symbol)).toEqual([
		'USD',
		'BTC',
	]);
});
test('Currency validation failure is logged/swallowed without a MongoDB insert', async () => {
	const log = jest.spyOn(console, 'error').mockImplementation(() => {});
	expect(
		await context.currencyRepository.save({ symbol: 'BAD', quote: 'not boolean' })
	).toBeUndefined();
	expect(log.mock.calls[0][0]).toMatchObject({ name: 'ValidationError' });
	expect(await context.Currency.countDocuments({ symbol: 'BAD' })).toBe(0);
});
test('Market saveAll returns empty before real writes then mutates its result while an earlier getter snapshot stays empty', async () => {
	const acknowledged = context.waitInsertAcks(2);
	const saved = context.marketRepository.saveAll([
		new context.Market({ name: 'LaterOne' }),
		new context.Market({ name: 'LaterTwo' }),
	]);
	expect(saved).toEqual([]);
	const snapshot = context.manager.getAllMarkets();
	expect(snapshot).toEqual([]);
	await acknowledged;
	expect(await context.Market.countDocuments({ name: { $in: ['LaterOne', 'LaterTwo'] } })).toBe(
		2
	);
	expect(saved.map(record => record.name).sort()).toEqual(['LaterOne', 'LaterTwo']);
	expect(snapshot).toEqual([]);
	expect(
		context.manager
			.getAllMarkets()
			.map(record => record.name)
			.sort()
	).toEqual(['LaterOne', 'LaterTwo']);
});
