const axios = require('axios');
const Market = require('../../../model/Market');
const manager = require('../../../marketsDBmanager');
const service = require('../../../service/marketService');
const { MARKETS } = require('../../testHelper');
const seed = require('../../fixtures/contracts/v1/seed.json');
const legacy = require('../support/legacy-rest.cjs');
const { market, clone, controlAxios, deferred, now } = require('../support/b2-fixtures.cjs');

let transport;
let errorLog;
beforeEach(() => {
	jest.useFakeTimers({ now: new Date(now), doNotFake: ['performance'] });
	jest.spyOn(console, 'log').mockImplementation(() => {});
	errorLog = jest.spyOn(console, 'error').mockImplementation(() => {});
	manager.setMarketsFromDB([]);
	manager.setAvailableCurrencies(clone(seed.currencies));
	manager.setAvailableTickers(clone(seed.legacyTickers));
});
afterEach(() => {
	if (transport) transport.close();
	transport = null;
	expect(jest.getTimerCount()).toBe(0);
	jest.useRealTimers();
});

test.each(legacy.cases)(
	'legacy %s/%s service case is now an exact offline body/URL assertion',
	async (name, ticker, native, url) => {
		manager.setMarketsFromDB(clone(MARKETS));
		transport = controlAxios(axios, [{ data: legacy.bodies[name] }]);
		await expect(
			service.getTickerByMarket(name.toLowerCase(), ticker.toLowerCase())
		).resolves.toEqual(legacy.bodies[name]);
		expect(transport.calls).toEqual([{ method: 'get', url }]);
		expect(
			MARKETS.find(value => value.name === name).availableTickersToMarketTickers[ticker]
		).toBe(native);
	}
);

test('market DTOs use real cached models and project only their current public fields', async () => {
	manager.setMarketsFromDB([market()]);
	await expect(service.getAllMarkets()).resolves.toEqual([
		{
			name: 'Alpha',
			website: 'https://alpha.invalid',
			type: 'synthetic exchange',
			tickers: { rest: [], websocket: ['BTC-USDT'] },
			tickerRestEndpoint: `https://alpha.invalid/ticker/\${ticker}`,
		},
	]);
});

test('legacy transport flags remain separate from derived currency pairs', () => {
	expect(service.getAllAvailableTickersByApi('rest')).toEqual(seed.legacyTickers);
});

test('all-ticker aggregation maps actual responses by market and keeps missing mappings as a TypeError', async () => {
	manager.setMarketsFromDB([market('Alpha'), market('Beta')]);
	transport = controlAxios(axios, [{ data: { price: '125' } }, { data: { price: '80' } }]);
	await expect(service.getAllMarketTickers('btc-usdt')).resolves.toEqual({
		Alpha: { price: '125' },
		Beta: { price: '80' },
	});
});

test('all-ticker aggregation rejects when one native mapping returns null', async () => {
	const beta = market('Beta');
	beta.availableTickersToMarketTickers = {};
	manager.setMarketsFromDB([market(), beta]);
	transport = controlAxios(axios, [{ data: { price: 80 } }]);
	await expect(service.getAllMarketTickers('BTC-USDT')).rejects.toThrow(TypeError);
});

test('a missing single-ticker mapping keeps its null.data TypeError', async () => {
	manager.setMarketsFromDB([market()]);
	transport = controlAxios(axios, []);
	await expect(service.getTickerByMarket('Alpha', 'MISSING')).rejects.toThrow(TypeError);
});

test('unknown single-market lookup retains its TypeError and makes no HTTP request', async () => {
	manager.setMarketsFromDB([]);
	transport = controlAxios(axios, []);
	await expect(service.getTickerByMarket('missing', 'BTC-USDT')).rejects.toThrow(TypeError);
});

test('all-price lookup filters missing mappings and sorts real extracted numeric prices', async () => {
	const missing = market('Missing');
	missing.availableTickersToMarketTickers = {};
	manager.setMarketsFromDB([market('Zulu'), market('Alpha'), market('Middle'), missing]);
	transport = controlAxios(axios, [
		{ data: { price: '125' } },
		{ data: { price: '80' } },
		{ data: { price: '100' } },
	]);
	const result = await service.getAllPricesByTicker('btc-usdt');
	expect(result).toEqual([
		{ platform: 'Alpha', ticker: 'alphabtcusdt', price: 80, date: new Date(now) },
		{ platform: 'Middle', ticker: 'middlebtcusdt', price: 100, date: new Date(now) },
		{ platform: 'Zulu', ticker: 'zulubtcusdt', price: 125, date: new Date(now) },
	]);
});

test('requested prices retain requested duplicates/order, unlike sorted all-price lookup', async () => {
	manager.setMarketsFromDB([market('Alpha'), market('Beta')]);
	transport = controlAxios(axios, [
		{ data: { price: '125' } },
		{ data: { price: '80' } },
		{ data: { price: '100' } },
	]);
	const result = await service.getMarketPrices(['Beta', 'missing', 'Alpha', 'Beta'], 'BTC-USDT');
	expect(result.map(value => [value.platform, value.price])).toEqual([
		['Beta', 125],
		['Alpha', 80],
		['Beta', 100],
	]);
});

test('default prices select REST-capable markets and omit resolved null prices', async () => {
	const noRest = market('NoRest');
	delete noRest.com.api.rest;
	const missing = market('Missing');
	missing.availableTickersToMarketTickers = {};
	manager.setMarketsFromDB([market(), noRest, missing]);
	transport = controlAxios(axios, [{ data: { price: '80' } }]);
	const result = await service.getMarketPrices(null, 'BTC-USDT');
	expect(result.map(value => value.platform)).toEqual(['Alpha']);
});

test('empty market state returns empty aggregate/prices', async () => {
	transport = controlAxios(axios, []);
	await expect(service.getAllMarketTickers('BTC-USDT')).resolves.toEqual({});
	await expect(service.getAllPricesByTicker('BTC-USDT')).resolves.toEqual([]);
	await expect(service.getMarketPrices([], 'BTC-USDT')).resolves.toEqual([]);
});

test('an exchange rejection propagates instead of silently dropping that price', async () => {
	manager.setMarketsFromDB([market()]);
	transport = controlAxios(axios, [{ error: new Error('controlled exchange failure') }]);
	await expect(service.getMarketPrices(null, 'BTC-USDT')).rejects.toEqual({
		code: 500,
		message: 'INTERNAL SERVER ERROR',
		description: 'controlled exchange failure',
	});
});

test('new-market validation awaits exchange prices and document save but does not await cache reload', async () => {
	const quote = deferred();
	const saved = deferred();
	const reload = deferred();
	const reloaded = [market('Reloaded')];
	const find = jest.spyOn(Market, 'find').mockReturnValue(reload.promise);
	const save = jest.spyOn(Market.prototype, 'save').mockImplementation(function saveDocument() {
		expect(this).toBeInstanceOf(Market);
		return saved.promise;
	});
	transport = controlAxios(axios, [{ deferred: quote }]);
	const request = service.saveNewMarket(market());
	expect(save).not.toHaveBeenCalled();
	quote.resolve({ price: '80' });
	const saveStarted = deferred();
	save.mockImplementationOnce(function captureSave() {
		saveStarted.resolve(this);
		return saved.promise;
	});
	const document = await saveStarted.promise;
	saved.resolve(document);
	await expect(request).resolves.toBe(document);
	expect(find).toHaveBeenCalledWith({});
	expect(manager.getAllMarkets()).toEqual([]);
	reload.resolve(reloaded);
	await reload.promise;
	expect(manager.getAllMarkets()).toEqual(reloaded);
});

test('failed market save is logged and resolves undefined without reloading', async () => {
	const error = new Error('controlled save failure');
	jest.spyOn(Market.prototype, 'save').mockRejectedValue(error);
	const find = jest.spyOn(Market, 'find');
	transport = controlAxios(axios, [{ data: { price: '80' } }]);
	await expect(service.saveNewMarket(market())).resolves.toBeUndefined();
	expect(errorLog).toHaveBeenCalledWith(error);
	expect(find).not.toHaveBeenCalled();
});

test('a failed pre-save exchange validation prevents document saving', async () => {
	const save = jest.spyOn(Market.prototype, 'save');
	transport = controlAxios(axios, [{ data: { price: '0' } }]);
	await expect(service.saveNewMarket(market())).rejects.toMatchObject({ code: 400 });
	expect(save).not.toHaveBeenCalled();
});
