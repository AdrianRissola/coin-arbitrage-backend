jest.mock('../../../marketWebSocketClient', () => ({
	getAllMarketTickerStream: jest.fn(),
	getWebSocketConnections: jest.fn(),
	connectAndSend: jest.fn(),
	close: jest.fn(),
}));

const { setImmediate } = require('node:timers');
const client = require('../../../marketWebSocketClient');
const manager = require('../../../marketsDBmanager');
const arbitrage = require('../../../service/arbitrageService');
const server = require('../../../service/webSocketServerService');
const clientService = require('../../../service/webSocketClientService');
const seed = require('../../fixtures/contracts/v1/seed.json');
const { market, clone, deferred, now } = require('../support/b2-fixtures.cjs');

const quote = (last, bid, ask) => ({ bid, ask, last });
const stream = () => ({
	alpha: {
		connected: true,
		data: {
			market: { name: 'Alpha' },
			tickerPrices: {
				'BTC-USDT': quote(77, 79, 80),
				'ETH-USD': quote(77, 79, 80),
			},
		},
	},
	beta: {
		connected: true,
		data: {
			market: { name: 'Beta' },
			tickerPrices: {
				'BTC-USDT': quote(130, 125, 126),
				'ETH-USD': quote(105, 100, 101),
			},
		},
	},
	offline: {
		connected: false,
		data: { market: { name: 'Offline' }, tickerPrices: { 'BTC-USDT': 1000 } },
	},
	zero: { connected: true, data: { market: { name: 'Zero' }, tickerPrices: { 'BTC-USDT': 0 } } },
});
const expectedArbitrage = {
	transactions: [
		{ type: 'BUY', market: 'Alpha', pair: 'BTC-USDT', price: 80 },
		{ type: 'SELL', market: 'Beta', pair: 'BTC-USDT', price: 125 },
	],
	profitPerUnit: 45,
	profitPercentage: 56.25,
	date: new Date(now),
};

beforeEach(() => {
	jest.useFakeTimers({ now: new Date(now), doNotFake: ['performance'] });
	jest.spyOn(console, 'log').mockImplementation(() => {});
	jest.spyOn(console, 'error').mockImplementation(() => {});
	jest.spyOn(arbitrage, 'saveMaxProfitArbitrageByTicker').mockResolvedValue(null);
	client.getAllMarketTickerStream.mockReset().mockReturnValue(stream());
	client.getWebSocketConnections.mockReset().mockReturnValue({});
	client.connectAndSend.mockReset().mockResolvedValue({ opened: true });
	client.close.mockReset().mockResolvedValue({ closed: true });
	manager.setMarketsFromDB([market()]);
	manager.setAvailableCurrencies(clone(seed.currencies));
	manager.setAvailableTickers(clone(seed.legacyTickers));
});
afterEach(() => {
	expect(jest.getTimerCount()).toBe(0);
	jest.useRealTimers();
});

test('stream DTO uses real helpers: uppercase key, nonzero prices and even a disconnected quote', async () => {
	await expect(server.streamAllMarketPrices('btc-usdt')).resolves.toEqual({
		'BTC-USDT': [
			{ market: 'Alpha', price: 77, bid: 79, ask: 80 },
			{ market: 'Beta', price: 130, bid: 125, ask: 126 },
			{ market: 'Offline', price: 1000, connected: false },
		],
	});
});

test('single-ticker channel calculates literal profits from connected quotes, not the disconnected DTO price', async () => {
	const result = await server.getArbitrageChannelInfo('btc-usdt');
	expect(result).toEqual({
		ticker: 'btc-usdt',
		channel: 'arbitrage',
		marketPrices: {
			'BTC-USDT': [
				{ market: 'Alpha', price: 77, bid: 79, ask: 80 },
				{ market: 'Beta', price: 130, bid: 125, ask: 126 },
				{ market: 'Offline', price: 1000, connected: false },
			],
		},
		arbitrages: { 'BTC-USDT': { 'Alpha-Beta': expectedArbitrage } },
	});
	expect(arbitrage.saveMaxProfitArbitrageByTicker).toHaveBeenCalledWith(expectedArbitrage);
});

test('single-ticker channel keeps Last for display but does not arbitrate with Last-only quotes', async () => {
	const data = stream();
	data.alpha.data.tickerPrices['BTC-USDT'] = { last: 80 };
	data.beta.data.tickerPrices['BTC-USDT'] = { last: 125 };
	client.getAllMarketTickerStream.mockReturnValue(data);

	await expect(server.getArbitrageChannelInfo('BTC-USDT')).resolves.toEqual({
		ticker: 'BTC-USDT',
		channel: 'arbitrage',
		marketPrices: {
			'BTC-USDT': [
				{ market: 'Alpha', price: 80 },
				{ market: 'Beta', price: 125 },
				{ market: 'Offline', price: 1000, connected: false },
			],
		},
		arbitrages: null,
		message: 'No arbitrage available for: BTC-USDT',
	});
	expect(arbitrage.saveMaxProfitArbitrageByTicker).not.toHaveBeenCalled();
});

test('single-ticker persistence is actually awaited before the channel proceeds', async () => {
	const consumed = deferred();
	const saved = deferred();
	arbitrage.saveMaxProfitArbitrageByTicker.mockReturnValue({
		then: (resolve, reject) => {
			consumed.resolve();
			return saved.promise.then(resolve, reject);
		},
	});
	const response = server.getArbitrageChannelInfo('BTC-USDT');
	await consumed.promise;
	saved.resolve(null);
	await expect(response).resolves.toMatchObject({ channel: 'arbitrage' });
});

test('a single-ticker persistence rejection propagates unchanged', async () => {
	const error = new Error('controlled stream persistence failure');
	arbitrage.saveMaxProfitArbitrageByTicker.mockRejectedValue(error);
	await expect(server.getArbitrageChannelInfo('BTC-USDT')).rejects.toBe(error);
});

test('pair-map keys sort market names without rewriting financial BUY/SELL orientation', async () => {
	const data = stream();
	data.alpha.data.market.name = 'Zulu';
	client.getAllMarketTickerStream.mockReturnValue(data);
	const result = await server.getArbitrageChannelInfo('BTC-USDT');
	expect(result.arbitrages['BTC-USDT']['Beta-Zulu'].transactions).toEqual([
		{ type: 'BUY', market: 'Zulu', pair: 'BTC-USDT', price: 80 },
		{ type: 'SELL', market: 'Beta', pair: 'BTC-USDT', price: 125 },
	]);
});

test('three-price stream ordering selects the independent 45/25/20 profit literals and saves the first', async () => {
	const data = stream();
	data.beta.data.tickerPrices['BTC-USDT'] = quote(100, 100, 100);
	data.gamma = {
		connected: true,
		data: { market: { name: 'Gamma' }, tickerPrices: { 'BTC-USDT': quote(125, 125, 125) } },
	};
	client.getAllMarketTickerStream.mockReturnValue(data);
	const result = await server.getArbitrageChannelInfo('BTC-USDT');
	const values = result.arbitrages['BTC-USDT'];
	expect(Object.keys(values)).toEqual(['Alpha-Gamma', 'Beta-Gamma', 'Alpha-Beta']);
	expect(
		Object.values(values).map(value => [value.profitPerUnit, value.profitPercentage])
	).toEqual([
		[45, 56.25],
		[25, 25],
		[20, 25],
	]);
	expect(arbitrage.saveMaxProfitArbitrageByTicker).toHaveBeenCalledWith(values['Alpha-Gamma']);
});

test('equal Ask and Bid stream quotes produce no arbitrage', async () => {
	const data = stream();
	data.beta.data.tickerPrices['BTC-USDT'] = quote(80, 79, 80);
	client.getAllMarketTickerStream.mockReturnValue(data);
	const result = await server.getArbitrageChannelInfo('BTC-USDT');
	expect(result.arbitrages['BTC-USDT']).toEqual({});
});

test('no or one connected quote retains null arbitrages and a no-data channel message', async () => {
	client.getAllMarketTickerStream.mockReturnValue({
		alpha: {
			connected: true,
			data: { market: { name: 'Alpha' }, tickerPrices: { 'BTC-USDT': 80 } },
		},
	});
	await expect(server.getArbitrageChannelInfo('BTC-USDT')).resolves.toEqual({
		ticker: 'BTC-USDT',
		channel: 'arbitrage',
		arbitrages: null,
		marketPrices: { 'BTC-USDT': [{ market: 'Alpha', price: 80 }] },
		message: 'No arbitrage available for: BTC-USDT',
	});
	expect(arbitrage.saveMaxProfitArbitrageByTicker).not.toHaveBeenCalled();
});

test('empty stream map gives a valid empty single-ticker channel', async () => {
	client.getAllMarketTickerStream.mockReturnValue({});
	await expect(server.getArbitrageChannelInfo('BTC-USDT')).resolves.toMatchObject({
		arbitrages: null,
		marketPrices: { 'BTC-USDT': [] },
		message: 'No arbitrage available for: BTC-USDT',
	});
});

test.each([null, undefined])(
	'missing stream map %p retains the DTO Object.keys TypeError',
	async data => {
		client.getAllMarketTickerStream.mockReturnValue(data);
		await expect(server.getArbitrageChannelInfo('BTC-USDT')).rejects.toThrow(TypeError);
	}
);

test('best channel groups one real top-profit result per quote and persists both records', async () => {
	const result = await server.getArbitrageChannelInfo('aLl');
	expect(result.ticker).toBe('ALL');
	expect(result.channel).toBe('bestArbitrage');
	const records = result.bestArbitrages.arbitragesData;
	expect(
		records.map(value => [
			value.arbitrage.transactions[0].pair,
			value.arbitrage.profitPerUnit,
			value.arbitrage.profitPercentage,
		])
	).toEqual([
		['BTC-USDT', 45, 56.25],
		['ETH-USD', 20, 25],
	]);
	expect(records[0].marketPrices).toEqual({
		'BTC-USDT': [
			{ market: 'Alpha', price: 77, bid: 79, ask: 80 },
			{ market: 'Beta', price: 130, bid: 125, ask: 126 },
			{ market: 'Offline', price: 1000, connected: false },
		],
	});
	expect(arbitrage.saveMaxProfitArbitrageByTicker).toHaveBeenCalledTimes(2);
});

test('best channel skips tickers with no profitable spread while retaining profitable quotes', async () => {
	const data = stream();
	data.alpha.data.tickerPrices['BTC-USDT'] = {
		bid: 99,
		ask: 100,
		last: 99.5,
		timestamp: Date.now(),
	};
	data.beta.data.tickerPrices['BTC-USDT'] = {
		bid: 100,
		ask: 101,
		last: 100.5,
		timestamp: Date.now(),
	};
	client.getAllMarketTickerStream.mockReturnValue(data);

	const result = await server.getArbitrageChannelInfo('ALL');

	expect(
		result.bestArbitrages.arbitragesData.map(row => row.arbitrage.transactions[0].pair)
	).toEqual(['ETH-USD']);
	expect(arbitrage.saveMaxProfitArbitrageByTicker).toHaveBeenCalledTimes(1);
});

test('best channel returns an empty envelope when connected markets have no profitable spreads', async () => {
	const data = stream();
	data.alpha.data.tickerPrices['BTC-USDT'] = { bid: 99, ask: 100, last: 99.5 };
	data.beta.data.tickerPrices['BTC-USDT'] = { bid: 100, ask: 101, last: 100.5 };
	data.alpha.data.tickerPrices['ETH-USD'] = { bid: 79, ask: 80, last: 79.5 };
	data.beta.data.tickerPrices['ETH-USD'] = { bid: 80, ask: 81, last: 80.5 };
	client.getAllMarketTickerStream.mockReturnValue(data);

	await expect(server.getArbitrageChannelInfo('ALL')).resolves.toEqual({
		ticker: 'ALL',
		channel: 'bestArbitrage',
		bestArbitrages: { arbitragesData: [] },
		message: 'No arbitrage available for: ALL',
	});
	expect(arbitrage.saveMaxProfitArbitrageByTicker).not.toHaveBeenCalled();
});

test.each([0, 1])('best channel awaits both saves when save %s finishes first', async first => {
	const consumed = [deferred(), deferred()];
	const saves = [deferred(), deferred()];
	let settled = false;
	arbitrage.saveMaxProfitArbitrageByTicker
		.mockImplementationOnce(() => ({
			then: (resolve, reject) => {
				consumed[0].resolve();
				return saves[0].promise.then(resolve, reject);
			},
		}))
		.mockImplementationOnce(() => ({
			then: (resolve, reject) => {
				consumed[1].resolve();
				return saves[1].promise.then(resolve, reject);
			},
		}));
	const response = server.getArbitrageChannelInfo('ALL').then(result => {
		settled = true;
		return result;
	});
	try {
		await expect(
			Promise.race([
				response.then(() => 'response'),
				Promise.all(consumed.map(save => save.promise)).then(() => 'saves'),
			])
		).resolves.toBe('saves');
		saves[first].resolve(null);
		await new Promise(resolve => {
			setImmediate(resolve);
		});
		expect(settled).toBe(false);
	} finally {
		saves.forEach(save => save.resolve(null));
		await response;
	}
});

test.each(['BTC-USDT', 'ETH-USD', 'both'])(
	'best channel propagates persistence rejection for %s through its returned promise',
	async ticker => {
		const error = new Error('controlled best-arbitrage persistence failure');
		arbitrage.saveMaxProfitArbitrageByTicker.mockImplementation(record => ({
			then: (resolve, reject) =>
				(ticker === 'both' || record.transactions[0].pair === ticker
					? Promise.reject(error)
					: Promise.resolve(null)
				).then(resolve, reject),
		}));
		await expect(server.getArbitrageChannelInfo('ALL')).rejects.toBe(error);
		expect(arbitrage.saveMaxProfitArbitrageByTicker).toHaveBeenCalledTimes(2);
	}
);

test.each([
	['uninitialised feed', null],
	['empty feed', {}],
	['one market', { alpha: stream().alpha }],
	['disconnected markets', { offline: stream().offline }],
])('ALL with %s returns the empty best envelope without persistence', async (name, data) => {
	client.getAllMarketTickerStream.mockReturnValue(data);
	await expect(server.getArbitrageChannelInfo('ALL')).resolves.toEqual({
		channel: 'bestArbitrage',
		ticker: 'ALL',
		bestArbitrages: { arbitragesData: [] },
		message: 'No arbitrage available for: ALL',
	});
	expect(arbitrage.saveMaxProfitArbitrageByTicker).not.toHaveBeenCalled();
});

test.each(['tickers', 'quote currencies'])(
	'ALL with no available %s returns an empty best envelope',
	async missing => {
		manager.setAvailableCurrencies(
			seed.currencies.filter(currency =>
				missing === 'tickers' ? !currency.base : !currency.quote
			)
		);
		await expect(server.getArbitrageChannelInfo('all')).resolves.toEqual({
			channel: 'bestArbitrage',
			ticker: 'ALL',
			bestArbitrages: { arbitragesData: [] },
			message: 'No arbitrage available for: all',
		});
		expect(arbitrage.saveMaxProfitArbitrageByTicker).not.toHaveBeenCalled();
	}
);

test('status channel uses actual connection flags and close descriptions without dropping undefined text', async () => {
	client.getWebSocketConnections.mockReturnValue({
		alpha: { connected: true },
		beta: { connected: false, closeDescription: 'controlled close' },
		gamma: { connected: false },
	});
	await expect(server.getMarketsChannelInfo()).resolves.toEqual({
		connectedMarkets: ['alpha'],
		disconnectedMarkets: ['beta - controlled close', 'gamma - undefined'],
	});
});

test('client-service open uses real manager ticker/market selection and returns the connector response', async () => {
	manager.setMarketsFromDB([market(), market('Beta')]);
	await expect(
		clientService.openAndSend({ markets: ['ALPHA'], tickers: ['btc-usdt'] })
	).resolves.toEqual({ opened: true });
	expect(client.connectAndSend).toHaveBeenCalledWith([market()], ['btc-usdt']);
});

test('an empty selected list is still passed to the lower-level connector', async () => {
	await clientService.openAndSend({ markets: ['missing'], tickers: ['BTC-USDT'] });
	expect(client.connectAndSend).toHaveBeenCalledWith([], ['BTC-USDT']);
});

test('uninitialised market state retains its current .markets TypeError before connecting', async () => {
	manager.setMarketsFromDB(null);
	await expect(clientService.openAndSend({ tickers: ['BTC-USDT'] })).rejects.toThrow(TypeError);
	expect(client.connectAndSend).not.toHaveBeenCalled();
});

test('close and status preserve lower-level arguments and response identities', async () => {
	const actions = { markets: ['Alpha'] };
	const status = { alpha: { connected: true } };
	client.getWebSocketConnections.mockReturnValue(status);
	await expect(clientService.close(actions)).resolves.toEqual({ closed: true });
	expect(client.close).toHaveBeenCalledWith(actions);
	expect(clientService.getStatus()).toBe(status);
});

test('connector rejection propagates without opening any real connection', async () => {
	const error = new Error('controlled connector failure');
	client.connectAndSend.mockRejectedValue(error);
	await expect(clientService.openAndSend({ tickers: ['BTC-USDT'] })).rejects.toBe(error);
});
