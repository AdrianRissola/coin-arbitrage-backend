const Arbitrage = require('../../../model/Arbitrage');
const service = require('../../../service/arbitrageService');
const { deferred, now } = require('../support/b2-fixtures.cjs');

let errorLog;

const input = () => ({
	_id: '64b000000000000000000001',
	transactions: [
		{ type: 'BUY', market: 'Alpha', pair: 'BTC-USDT', price: 80 },
		{ type: 'SELL', market: 'Beta', pair: 'BTC-USDT', price: 125 },
	],
	profitPerUnit: 45,
	profitPercentage: 36,
	date: now,
});
const query = value => {
	const result = Promise.resolve(value);
	return {
		sort: jest.fn().mockReturnThis(),
		limit: jest.fn().mockReturnValue(result),
		then: (resolve, reject) => result.then(resolve, reject),
	};
};

beforeEach(() => {
	jest.spyOn(console, 'log').mockImplementation(() => {});
	errorLog = jest.spyOn(console, 'error').mockImplementation(() => {});
	jest.spyOn(Arbitrage, 'find').mockImplementation(() => {
		throw new Error('Unexpected model query');
	});
	jest.spyOn(Arbitrage.prototype, 'save').mockImplementation(() => {
		throw new Error('Unexpected model save');
	});
});

test('max-profit selection uses the literal pair/ordered-market query, descending profit and one-result limit', async () => {
	const selected = query([]);
	Arbitrage.find.mockReturnValue(selected);
	const saved = deferred();
	const started = deferred();
	Arbitrage.prototype.save.mockImplementationOnce(function captureSave() {
		started.resolve(this);
		return saved.promise;
	});
	const result = service.saveMaxProfitArbitrageByTicker(input());
	const document = await started.promise;
	expect(document).toBeInstanceOf(Arbitrage);
	expect(document.toObject()).toMatchObject({
		profitPerUnit: 45,
		profitPercentage: 36,
		date: new Date(now),
	});
	expect(Arbitrage.find).toHaveBeenCalledWith({
		'transactions.0.pair': 'BTC-USDT',
		'transactions.0.market': 'Alpha',
		'transactions.1.market': 'Beta',
	});
	expect(selected.sort).toHaveBeenCalledWith({ profitPercentage: -1 });
	expect(selected.limit).toHaveBeenCalledWith(1);
	saved.resolve(document);
	await expect(result).resolves.toBe(document);
});

test('a strictly better incoming profit saves through the real document constructor', async () => {
	Arbitrage.find.mockReturnValue(query([{ profitPercentage: 20 }]));
	Arbitrage.prototype.save.mockImplementation(function saveDocument() {
		return Promise.resolve(this);
	});
	await expect(service.saveMaxProfitArbitrageByTicker(input())).resolves.toBeInstanceOf(
		Arbitrage
	);
	expect(Arbitrage.prototype.save).toHaveBeenCalledTimes(1);
});

test.each([36, 37, undefined])(
	'equal/higher/missing existing profit %p suppresses a new save and returns null',
	async profitPercentage => {
		Arbitrage.find.mockReturnValue(query([{ profitPercentage }]));
		await expect(service.saveMaxProfitArbitrageByTicker(input())).resolves.toBeNull();
		expect(Arbitrage.prototype.save).not.toHaveBeenCalled();
	}
);

test('rejected document saves retain logged undefined rather than rejecting', async () => {
	const error = new Error('controlled arbitrage save failure');
	Arbitrage.find.mockReturnValue(query([]));
	Arbitrage.prototype.save.mockRejectedValue(error);
	await expect(service.saveMaxProfitArbitrageByTicker(input())).resolves.toBeUndefined();
	expect(errorLog).toHaveBeenCalledWith(error);
});

test('a max-profit query failure propagates unchanged before saving', async () => {
	const error = new Error('controlled arbitrage find failure');
	const selected = query([]);
	selected.limit.mockRejectedValue(error);
	Arbitrage.find.mockReturnValue(selected);
	await expect(service.saveMaxProfitArbitrageByTicker(input())).rejects.toBe(error);
	expect(Arbitrage.prototype.save).not.toHaveBeenCalled();
});

test('an incomplete transaction array keeps its TypeError before constructing a query', async () => {
	await expect(service.saveMaxProfitArbitrageByTicker({ transactions: [] })).rejects.toThrow(
		TypeError
	);
	expect(Arbitrage.find).not.toHaveBeenCalled();
});

test.each([[['BTC-USDT', 'ETH-USD']], [[]], [null], [undefined]])(
	'history builds the literal $in query without inventing input normalisation: %p',
	async tickers => {
		const records = [input()];
		const selected = query(records);
		Arbitrage.find.mockReturnValue(selected);
		await expect(service.getByTickerOrderByDateDesc(tickers)).resolves.toBe(records);
		expect(Arbitrage.find).toHaveBeenCalledWith({ 'transactions.0.pair': { $in: tickers } });
		expect(selected.sort).toHaveBeenCalledWith({ date: -1 });
		expect(selected.limit).not.toHaveBeenCalled();
	}
);

test('a history query rejection propagates unchanged', async () => {
	const error = new Error('controlled history query failure');
	Arbitrage.find.mockReturnValue({ sort: jest.fn().mockRejectedValue(error) });
	await expect(service.getByTickerOrderByDateDesc(['BTC-USDT'])).rejects.toBe(error);
});
