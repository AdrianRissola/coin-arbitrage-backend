jest.mock('../../../model/Market', () => ({
	find: jest.fn(() => {
		throw new Error('Mongo access is outside B1');
	}),
}));

const model = require('../../../model/Market');
const manager = require('../../../marketsDBmanager');
const seed = require('../../fixtures/contracts/v1/seed.json');
const available = require('../../fixtures/contracts/v1/available-tickers.json');

const clone = value => JSON.parse(JSON.stringify(value));
const market = name => ({
	name,
	availableTickersToMarketTickers: { 'BTC-USDT': 'nativeBTCUSDT' },
	com: {
		api: {
			rest: {
				base: `https://${name.toLowerCase()}.invalid/`,
				tickerPath: 'ticker',
				pathToPrice: [],
			},
			websocket: {
				host: `${name.toLowerCase()}.invalid`,
				url: `wss://${name.toLowerCase()}.invalid`,
				tickerRequest: `\${ticker}`,
				pathToPrice: [],
				tickers: ['BTC-USDT'],
			},
		},
	},
});

beforeEach(() => {
	manager.setMarketsFromDB([]);
	manager.setAvailableCurrencies(clone(seed.currencies));
	manager.setAvailableTickers(clone(seed.legacyTickers));
});

afterEach(() => {
	expect(model.find).not.toHaveBeenCalled();
});

test('Currency flags produce the independent four-pair literals', () => {
	expect(manager.getAllAvailableTickers()).toEqual(available);
});

test('legacy API flags are separate from Currency-derived pairs', () => {
	manager.setAvailableTickers([{ name: 'LEGACY-PAIR', rest: true, websocket: false }]);
	expect(manager.getAllAvailableTickerNamesByApi('rest')).toEqual(['LEGACY-PAIR']);
	expect(manager.getAllAvailableTickers()).toEqual(available);
});

test('all-pairs generation removes duplicate symbols and excludes self pairs', () => {
	manager.setAvailableCurrencies([
		{ symbol: 'BTC', name: 'Bitcoin', base: true, quote: true },
		{ symbol: 'BTC', name: 'Duplicate', base: true, quote: true },
		{ symbol: 'USD', name: 'Dollar', base: false, quote: true },
	]);
	expect(manager.getAllAvailableTickers()).toEqual([
		{ name: 'BTC-USD', description: 'Bitcoin - Dollar' },
	]);
});

test('default object sorting preserves insertion order rather than pair-name ordering', () => {
	manager.setAvailableCurrencies(clone(seed.currencies).reverse());
	expect(manager.getAllAvailableTickers().map(value => value.name)).toEqual([
		'ETH-USD',
		'ETH-USDT',
		'BTC-USD',
		'BTC-USDT',
	]);
});

test('per-currency reversed pairs currently retain duplicate quote records', () => {
	manager.setAvailableCurrencies([
		{ symbol: 'USD', name: 'Dollar', base: false, quote: true },
		{ symbol: 'USD', name: 'Dollar', base: false, quote: true },
	]);
	expect(
		manager.getAllAvailableTickersByCurrency({
			symbol: 'BTC',
			name: 'Bitcoin',
			base: true,
			quote: false,
		})
	).toEqual([
		{ name: 'BTC-USD', description: 'Bitcoin - Dollar' },
		{ name: 'BTC-USD', description: 'Bitcoin - Dollar' },
	]);
});

test('per-quote-currency selection excludes the currency itself', () => {
	expect(manager.getAllAvailableTickersByCurrency(seed.currencies[2])).toEqual([
		{ name: 'BTC-USDT', description: 'Bitcoin - Tether' },
		{ name: 'ETH-USDT', description: 'Ethereum - Tether' },
	]);
});

test('type filters use the existing base/quote flags', () => {
	expect(manager.getAvailableCurrenciesByType('base').map(value => value.symbol)).toEqual([
		'BTC',
		'ETH',
	]);
	expect(manager.getAvailableCurrenciesByType('quote').map(value => value.symbol)).toEqual([
		'USDT',
		'USD',
	]);
});

test('uninitialized legacy flags distinguish null objects from empty names', () => {
	manager.setAvailableTickers(null);
	expect(manager.getAllAvailableTickersByApi('rest')).toBeNull();
	expect(manager.getAllAvailableTickerNamesByApi('rest')).toEqual([]);
});

test('legacy API object filtering preserves the original records', () => {
	expect(manager.getAllAvailableTickersByApi('rest')).toEqual(seed.legacyTickers);
});

test('null currency state has different existing all-pair and per-type outcomes', () => {
	manager.setAvailableCurrencies(null);
	expect(manager.getAvailableCurrencies()).toBeNull();
	expect(manager.getAllAvailableTickers()).toEqual([]);
	expect(() => manager.getAvailableCurrenciesByType('base')).toThrow(TypeError);
});

test('cached market lookup ignores name case and returns null for absent names', () => {
	const alpha = market('Alpha');
	manager.setMarketsFromDB([alpha]);
	expect(manager.getMarketByName('aLpHa')).toBe(alpha);
	expect(manager.getMarketByName('missing')).toBeNull();
});

test('requested market ordering and duplicates are retained', async () => {
	const alpha = market('Alpha');
	const beta = market('Beta');
	manager.setMarketsFromDB([alpha, beta]);
	expect(await manager.getMarketsByNames(['beta', 'ALPHA', 'missing', 'alpha'])).toEqual([
		beta,
		alpha,
		alpha,
	]);
});

test('support filtering requires transport fields but accepts empty price paths', async () => {
	const alpha = market('Alpha');
	const beta = market('Beta');
	delete beta.com.api.rest.tickerPath;
	delete beta.com.api.websocket.url;
	manager.setMarketsFromDB([alpha, beta, { name: 'Bare' }]);
	expect(manager.getAllMarkets('rest')).toEqual([alpha]);
	expect(await manager.getMarketsByNames(['alpha', 'beta'], 'websocket')).toEqual([alpha]);
	expect(manager.getAllMarkets()).toHaveLength(3);
});

test('WebSocket host lookup ignores case', () => {
	const alpha = market('Alpha');
	manager.setMarketsFromDB([alpha]);
	expect(manager.getMarketByWebsocketHost('ALPHA.INVALID')).toBe(alpha);
	expect(manager.getMarketByWebsocketHost('missing.invalid')).toBeNull();
});

test('native ticker lookup uppercases app tickers without changing native values', () => {
	manager.setMarketsFromDB([market('Alpha')]);
	expect(manager.getMarketTickerName('alpha', 'btc-usdt')).toBe('nativeBTCUSDT');
	expect(manager.getMarketTickerName('alpha', 'ETH-USDT')).toBeUndefined();
	expect(() => manager.getMarketTickerName('missing', 'BTC-USDT')).toThrow(TypeError);
});

test('ticker-based market selection retains its expected diagnostic log', () => {
	const log = jest.spyOn(console, 'log').mockImplementation(() => {});
	const alpha = market('Alpha');
	manager.setMarketsFromDB([alpha]);
	expect(manager.getAllMarketsByTicker('btc-usdt')).toEqual([alpha]);
	expect(log).toHaveBeenCalledTimes(1);
});

test('WebSocket selection applies ticker and market-name filters', () => {
	const alpha = market('Alpha');
	manager.setMarketsFromDB([alpha, market('Beta')]);
	expect(manager.getMarketsWithWebsocket(['btc-usdt'], ['ALPHA'])).toEqual([alpha]);
	expect(manager.getMarketsWithWebsocket(['ETH-USDT'])).toEqual([]);
	expect(manager.getMarketsWithWebsocket([])).toEqual([]);
	expect(manager.getWebsocketHosts(['alpha'], ['BTC-USDT'])).toEqual(['alpha.invalid']);
});

test('a string ticker argument retains its native some-is-not-a-function failure', () => {
	manager.setMarketsFromDB([market('Alpha')]);
	expect(() => manager.getWebsocketHosts(null, 'BTC-USDT')).toThrow(TypeError);
});

test('uninitialized WebSocket market state returns null without querying Mongo', () => {
	manager.setMarketsFromDB(null);
	expect(manager.getMarketsWithWebsocket(['BTC-USDT'])).toBeNull();
});
