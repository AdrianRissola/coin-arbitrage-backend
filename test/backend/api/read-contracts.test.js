const { loadHttpApp } = require('../support/http-app.cjs');
const tickers = require('../../fixtures/contracts/v1/available-tickers.json');
const history = require('../../fixtures/contracts/v1/historical-arbitrages.json');

const base = '/coin-arbitrage/crypto';
let context;
beforeEach(async () => {
	context = await loadHttpApp();
});

test('GET markets projects exact public DTOs from real controlled documents', async () => {
	const response = await context.api.get(`${base}/markets`).expect(200);
	expect(response.type).toBe('application/json');
	expect(response.body).toEqual(
		['Alpha', 'Beta', 'Gamma'].map(name => ({
			name,
			website: `https://${name.toLowerCase()}.invalid`,
			type: 'synthetic exchange',
			tickers: { rest: [], websocket: ['BTC-USDT'] },
			tickerRestEndpoint: `https://${name.toLowerCase()}.invalid/ticker/\${ticker}`,
		}))
	);
});

test('GET available tickers preserves literal derived pair order and descriptions', async () => {
	const response = await context.api.get(`${base}/available-tickers`).expect(200);
	expect(response.type).toBe('application/json');
	expect(response.body).toEqual(tickers);
});

test('empty public manager data returns empty collections rather than error envelopes', async () => {
	context.manager.setMarketsFromDB([]);
	context.manager.setAvailableCurrencies([]);
	expect((await context.api.get(`${base}/markets`).expect(200)).body).toEqual([]);
	expect((await context.api.get(`${base}/available-tickers`).expect(200)).body).toEqual([]);
});

test.each([
	['?tickers[]=BTC-USDT', ['BTC-USDT']],
	['?tickers[]=BTC-USDT&tickers[]=ETH-USDT', ['BTC-USDT', 'ETH-USDT']],
	['?tickers=BTC-USDT&tickers=ETH-USDT', ['BTC-USDT', 'ETH-USDT']],
	['?tickers=BTC-USDT', 'BTC-USDT'],
	['', undefined],
	['?tickers=', ''],
	['?tickers[name]=BTC-USDT', { name: 'BTC-USDT' }],
])(
	'GET history %s carries actual Express query shape to real service/model boundary',
	async (query, value) => {
		const response = await context.api.get(`${base}/historical-arbitrages${query}`).expect(200);
		expect(response.type).toBe('application/json');
		expect(response.body).toEqual(history);
		expect(context.Arbitrage.find).toHaveBeenCalledWith({
			'transactions.0.pair': { $in: value },
			priceBasis: 'bidAsk',
		});
		expect(context.historySort).toHaveBeenCalledWith({ date: -1 });
	}
);

test.each([
	['http://test-client.invalid', 'http://test-client.invalid'],
	['http://other-client.invalid', undefined],
	[undefined, undefined],
])('real middleware applies its current origin policy for %p', async (origin, allowed) => {
	const request = context.api.get(`${base}/markets`);
	if (origin) request.set('Origin', origin);
	const response = await request.expect(200);
	expect(response.headers['access-control-allow-origin']).toBe(allowed);
	expect(response.headers['access-control-allow-methods']).toBe('GET');
	expect(response.headers['access-control-allow-headers']).toBe('X-Requested-With,content-type');
	expect(response.headers['access-control-allow-credentials']).toBe('true');
});

test('OPTIONS keeps Express automatic method reporting and current GET-only CORS declaration', async () => {
	const response = await context.api
		.options(`${base}/markets`)
		.set('Origin', 'http://test-client.invalid')
		.expect(200);
	expect(response.headers.allow).toBe('GET,HEAD,POST');
	expect(response.text).toBe('GET,HEAD,POST');
	expect(response.headers['access-control-allow-methods']).toBe('GET');
});

test('HEAD uses the real GET route headers without an invented body', async () => {
	const response = await context.api.head(`${base}/markets`).expect(200);
	expect(response.type).toBe('application/json');
	expect(response.text).toBeUndefined();
	expect(Number(response.headers['content-length'])).toBeGreaterThan(0);
});

test.each([
	['get', '/missing-b3-route'],
	['put', `${base}/markets`],
])('unknown %s %s remains Express HTML 404', async (method, route) => {
	const response = await context.api[method](route).expect(404);
	expect(response.type).toBe('text/html');
	expect(response.text).toContain(`Cannot ${method.toUpperCase()} ${route}`);
});

test('root summary is actual HTML rather than the JSON API', async () => {
	const response = await context.api.get('/').expect(200);
	expect(response.type).toBe('text/html');
	expect(response.text).toContain('<h1>Coin Arbitrage</h1>');
	expect(response.text).toContain('/coin-arbitrage/crypto/current-arbitrages');
});

test('malformed JSON returns default Express HTML 400 before the router and CORS middleware', async () => {
	const response = await context.api
		.post(`${base}/markets`)
		.set('Origin', 'http://test-client.invalid')
		.set('Content-Type', 'application/json')
		.send('{')
		.expect(400);
	expect(response.type).toBe('text/html');
	expect(response.text).toContain('SyntaxError');
	expect(response.headers['access-control-allow-origin']).toBeUndefined();
});
