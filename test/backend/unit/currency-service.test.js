jest.mock('../../../repository/currencyRepository', () => ({ save: jest.fn() }));
jest.mock('../../../repository/marketRepository', () => ({ saveAll: jest.fn() }));

const axios = require('axios');
const manager = require('../../../marketsDBmanager');
const currencyRepository = require('../../../repository/currencyRepository');
const marketRepository = require('../../../repository/marketRepository');
const service = require('../../../service/currencyService');
const seed = require('../../fixtures/contracts/v1/seed.json');
const { market, clone, controlAxios, deferred } = require('../support/b2-fixtures.cjs');

let transport;
let errorLog;
beforeEach(() => {
	jest.spyOn(console, 'log').mockImplementation(() => {});
	errorLog = jest.spyOn(console, 'error').mockImplementation(() => {});
	currencyRepository.save.mockReset().mockResolvedValue({ databaseResult: true });
	marketRepository.saveAll.mockReset().mockReturnValue([]);
	manager.setMarketsFromDB([]);
	manager.setAvailableCurrencies(clone(seed.currencies));
	manager.setAvailableTickers(clone(seed.legacyTickers));
	delete global.result;
	delete global.url;
});
afterEach(() => {
	if (transport) transport.close();
	transport = null;
	delete global.result;
	delete global.url;
});

test('rank 66 is accepted, exact symbol wins and caller identity/extra fields are retained', async () => {
	const request = { symbol: 'BTC', name: 'old', extra: 'retained' };
	transport = controlAxios(axios, [
		{
			data: {
				coins: [
					{ symbol: 'btc', name: 'Wrong case', market_cap_rank: 1 },
					{ symbol: 'BTC', name: 'Bitcoin', market_cap_rank: 66 },
					{ symbol: 'BTC', name: 'Later match', market_cap_rank: 1 },
				],
			},
		},
	]);
	await expect(service.saveCurrency(request)).resolves.toBe(request);
	expect(request).toEqual({
		symbol: 'BTC',
		name: 'Bitcoin',
		extra: 'retained',
		base: true,
		quote: false,
	});
	expect(currencyRepository.save).toHaveBeenCalledWith(request);
	expect(marketRepository.saveAll).toHaveBeenCalledWith([]);
	expect(transport.calls).toEqual([
		{ method: 'get', url: 'https://api.coingecko.com/api/v3/search?query=BTC' },
	]);
	expect(global.result).toEqual({ symbol: 'BTC', name: 'Bitcoin', market_cap_rank: 66 });
});

test.each([undefined, null, 0, 67])(
	'rank %p preserves its actual BAD REQUEST without mutating the caller',
	async rank => {
		const request = { symbol: 'BTC', name: 'unchanged' };
		transport = controlAxios(axios, [
			{ data: { coins: [{ symbol: 'BTC', name: 'Bitcoin', market_cap_rank: rank }] } },
		]);
		const description =
			rank === 67
				? 'BTC market_cap_rank = 67, allowed <= 66'
				: 'BTC has no market_cap_rank, market_cap_rank_allowed <= 66';
		await expect(service.saveCurrency(request)).rejects.toEqual({
			code: 400,
			message: 'BAD REQUEST',
			description,
		});
		expect(request).toEqual({ symbol: 'BTC', name: 'unchanged' });
		expect(currencyRepository.save).not.toHaveBeenCalled();
	}
);

test.each([1, -1])(
	'the existing truthy <=66 rule accepts rank %p, without invented validation',
	async rank => {
		transport = controlAxios(axios, [
			{ data: { coins: [{ symbol: 'BTC', name: 'Bitcoin', market_cap_rank: rank }] } },
		]);
		await expect(service.saveCurrency({ symbol: 'BTC' })).resolves.toEqual({
			symbol: 'BTC',
			name: 'Bitcoin',
			base: true,
			quote: false,
		});
	}
);

test.each([
	['absent', []],
	['case-only', [{ symbol: 'btc', name: 'Wrong case', market_cap_rank: 1 }]],
])('%s symbol matches retain NOT FOUND', async (name, coins) => {
	transport = controlAxios(axios, [{ data: { coins } }]);
	await expect(service.saveCurrency({ symbol: 'BTC' })).rejects.toEqual({
		code: 404,
		message: 'NOT FOUND',
		description: 'currency not found',
	});
	expect(currencyRepository.save).not.toHaveBeenCalled();
});

test('currency lookup still interpolates the supplied symbol without URL escaping', async () => {
	transport = controlAxios(axios, [
		{ data: { coins: [{ symbol: 'A B&x', name: 'Literal', market_cap_rank: 1 }] } },
	]);
	await service.saveCurrency({ symbol: 'A B&x' });
	expect(transport.calls).toEqual([
		{ method: 'get', url: 'https://api.coingecko.com/api/v3/search?query=A B&x' },
	]);
});

test('currency persistence is awaited before pair and market ticker updates', async () => {
	const saved = deferred();
	currencyRepository.save.mockReturnValue(saved.promise);
	const alpha = market();
	alpha.com.api.websocket.tickers = ['BTC-USDT', 'KEEP', 'BTC-USDT'];
	const noSocket = market('NoSocket');
	delete noSocket.com.api.websocket;
	manager.setMarketsFromDB([alpha, noSocket]);
	transport = controlAxios(axios, [
		{ data: { coins: [{ symbol: 'BTC', name: 'Bitcoin', market_cap_rank: 1 }] } },
	]);
	const started = deferred();
	currencyRepository.save.mockImplementationOnce(value => {
		started.resolve(value);
		return saved.promise;
	});
	const request = service.saveCurrency({ symbol: 'BTC' });
	await started.promise;
	expect(alpha.com.api.websocket.tickers).toEqual(['BTC-USDT', 'KEEP', 'BTC-USDT']);
	expect(marketRepository.saveAll).not.toHaveBeenCalled();
	saved.resolve({ ignored: true });
	await request;
	expect(alpha.com.api.websocket.tickers).toEqual(['BTC-USDT', 'KEEP', 'BTC-USD']);
	expect(marketRepository.saveAll).toHaveBeenCalledWith([alpha]);
	expect(manager.getAvailableCurrencies()).toEqual(seed.currencies);
	expect(manager.getAllAvailableTickerNamesByApi('rest')).toEqual([
		'BTC-USDT',
		'BTC-USD',
		'ETH-USDT',
		'ETH-USD',
	]);
});

test('the service does not await the returned market saveAll promise', async () => {
	const pending = deferred();
	marketRepository.saveAll.mockReturnValue(pending.promise);
	transport = controlAxios(axios, [
		{ data: { coins: [{ symbol: 'BTC', name: 'Bitcoin', market_cap_rank: 1 }] } },
	]);
	await expect(service.saveCurrency({ symbol: 'BTC' })).resolves.toMatchObject({
		name: 'Bitcoin',
	});
	pending.resolve([]);
	await pending.promise;
});

test('a rejected currency save propagates after request mutation and before any market save', async () => {
	const error = new Error('controlled currency persistence failure');
	currencyRepository.save.mockRejectedValue(error);
	const request = { symbol: 'BTC' };
	transport = controlAxios(axios, [
		{ data: { coins: [{ symbol: 'BTC', name: 'Bitcoin', market_cap_rank: 1 }] } },
	]);
	await expect(service.saveCurrency(request)).rejects.toBe(error);
	expect(request).toEqual({ symbol: 'BTC', name: 'Bitcoin', base: true, quote: false });
	expect(marketRepository.saveAll).not.toHaveBeenCalled();
});

test.each([{ response: { status: 503 } }, { request: {} }])(
	'CoinGecko response/request errors keep the current undefined-url ReferenceError: %j',
	async properties => {
		transport = controlAxios(axios, [
			{ error: Object.assign(new Error('controlled lookup failure'), properties) },
		]);
		await expect(service.saveCurrency({ symbol: 'BTC' })).rejects.toThrow('url is not defined');
		expect(errorLog).toHaveBeenCalledWith('controlled lookup failure');
		expect(currencyRepository.save).not.toHaveBeenCalled();
	}
);

test('CoinGecko setup errors preserve the real INTERNAL SERVER ERROR object', async () => {
	transport = controlAxios(axios, [{ error: new Error('controlled setup failure') }]);
	await expect(service.saveCurrency({ symbol: 'BTC' })).rejects.toEqual({
		code: 500,
		message: 'INTERNAL SERVER ERROR',
		description: 'controlled setup failure',
	});
});

test('a malformed successful lookup payload follows the existing setup-error conversion', async () => {
	transport = controlAxios(axios, [{ data: {} }]);
	await expect(service.saveCurrency({ symbol: 'BTC' })).rejects.toMatchObject({
		code: 500,
		message: 'INTERNAL SERVER ERROR',
		description: expect.stringContaining('filter'),
	});
});
