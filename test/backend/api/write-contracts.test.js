const { loadHttpApp } = require('../support/http-app.cjs');
const { market } = require('../support/b2-fixtures.cjs');
const historical = require('../../fixtures/contracts/v1/historical-arbitrages.json');

const base = '/coin-arbitrage/crypto';
const price = () => [{ data: { price: '80' } }];

test('POST market uses the real validation/service/schema path and JSON document serialization', async () => {
	const context = await loadHttpApp({ exchange: price() });
	context.planSave('Market');
	const response = await context.api
		.post(`${base}/markets`)
		.send({ ...market('New'), ignored: true })
		.expect(200);
	expect(response.type).toBe('application/json');
	expect(response.body).toMatchObject({
		name: 'New',
		type: 'synthetic exchange',
		availableTickersToMarketTickers: { 'BTC-USDT': 'newbtcusdt' },
	});
	const { _id: id } = response.body;
	expect(id).toMatch(/^[a-f0-9]{24}$/);
	expect(response.body.ignored).toBeUndefined();
	expect(context.Market.find).toHaveBeenCalledTimes(3);
	expect(context.transport.calls).toEqual([
		{ method: 'get', url: 'https://new.invalid/ticker/newbtcusdt' },
	]);
});

test.each([
	['missing name', ['name'], undefined],
	['empty name', ['name'], ''],
	['without API/rest data', ['com'], {}],
	['without https', ['com', 'api', 'rest', 'base'], 'http://new.invalid/'],
	['without tickers', ['availableTickersToMarketTickers'], {}],
	['invalid app ticker', ['availableTickersToMarketTickers'], { MISSING: 'native' }],
	['empty extraction path', ['com', 'api', 'rest', 'pathToPrice'], []],
	['missing extraction path', ['com', 'api', 'rest', 'pathToPrice'], undefined],
])(
	'POST market rejects %s with the actual BAD_REQUEST body before exchange/save',
	async (name, path, value) => {
		const context = await loadHttpApp();
		const payload = market('New');
		let target = payload;
		path.slice(0, -1).forEach(key => {
			target = target[key];
		});
		target[path[path.length - 1]] = value;
		const response = await context.api.post(`${base}/markets`).send(payload).expect(400);
		expect(response.body).toEqual({
			error: { code: 400, message: 'BAD REQUEST', description: 'invalid request' },
		});
		expect(context.saved).toEqual([]);
	}
);

test('POST market does not validate a native ticker alias if its controlled price resolves', async () => {
	const context = await loadHttpApp({ exchange: price() });
	const payload = market('New');
	payload.availableTickersToMarketTickers['BTC-USDT'] = 'WRONG_NATIVE';
	context.planSave('Market');
	const response = await context.api.post(`${base}/markets`).send(payload).expect(200);
	expect(response.body.availableTickersToMarketTickers['BTC-USDT']).toBe('WRONG_NATIVE');
	expect(context.transport.calls[0].url).toBe('https://new.invalid/ticker/WRONG_NATIVE');
});

test.each(['invalid market path', 'invalid native alias'])(
	'POST market %s surfaces a controlled HTTP upstream error as 400',
	async name => {
		const context = await loadHttpApp({
			exchange: [
				{
					error: Object.assign(new Error('B3 upstream rejected'), {
						response: { status: 404 },
					}),
				},
			],
		});
		const payload = market('New');
		if (name === 'invalid market path') payload.com.api.rest.tickerPath = `missing/\${ticker}`;
		else payload.availableTickersToMarketTickers['BTC-USDT'] = 'WRONG_NATIVE';
		const response = await context.api.post(`${base}/markets`).send(payload).expect(400);
		expect(response.body.error).toMatchObject({ code: 400, message: 'BAD REQUEST' });
		expect(response.body.error.description).toContain(
			'B3 upstream rejected when: GET https://new.invalid/'
		);
	}
);

test('POST market invalid-host setup failure retains 500, not the legacy assumed 400', async () => {
	const context = await loadHttpApp({
		exchange: [{ error: new Error('B3 invalid-host setup') }],
	});
	const response = await context.api.post(`${base}/markets`).send(market('New')).expect(500);
	expect(response.body).toEqual({
		error: {
			code: 500,
			message: 'INTERNAL SERVER ERROR',
			description: 'B3 invalid-host setup',
		},
	});
});

test('POST market bad extraction path is rejected through the real price extractor', async () => {
	const context = await loadHttpApp({ exchange: price() });
	const payload = market('New');
	payload.com.api.rest.pathToPrice = ['data', 'MISSING_PRICE'];
	const response = await context.api.post(`${base}/markets`).send(payload).expect(400);
	expect(response.body.error).toMatchObject({ code: 400, message: 'BAD REQUEST' });
	expect(typeof response.body.error.description).toBe('string');
});

test('POST market controlled save failure stays swallowed and sends an empty 200 response', async () => {
	const context = await loadHttpApp({ exchange: price() });
	context.planSave('Market', { error: new Error('B3 market save rejected') });
	const response = await context.api.post(`${base}/markets`).send(market('New')).expect(200);
	expect(response.text).toBe('');
	expect(response.type).toBe('application/json');
	expect(context.errors.some(args => args[0]?.message === 'B3 market save rejected')).toBe(true);
});

test('POST currency augments the actual request while real repository and market orchestration run', async () => {
	const context = await loadHttpApp({
		exchange: [{ data: { coins: [{ symbol: 'NEW', name: 'New Coin', market_cap_rank: 1 }] } }],
	});
	context.planSave('Currency');
	context.markets.forEach(() => context.planSave('Market'));
	const response = await context.api
		.post(`${base}/currency`)
		.send({ symbol: 'NEW', extra: 'retained' })
		.expect(200);
	expect(response.body).toEqual({
		symbol: 'NEW',
		extra: 'retained',
		name: 'New Coin',
		base: true,
		quote: false,
	});
	expect(context.transport.calls).toEqual([
		{ method: 'get', url: 'https://api.coingecko.com/api/v3/search?query=NEW' },
	]);
	expect(context.markets[0].com.api.websocket.tickers).toEqual([
		'BTC-USDT',
		'NEW-USDT',
		'NEW-USD',
	]);
	const tickers = await context.api.get(`${base}/available-tickers`).expect(200);
	expect(tickers.body.some(ticker => ticker.name.startsWith('NEW-'))).toBe(false);
});

test.each(['AA', 'AAAAAA', 'aaa', '123', ''])(
	'POST currency rejects malformed symbol %p before external lookup',
	async symbol => {
		const context = await loadHttpApp();
		const response = await context.api.post(`${base}/currency`).send({ symbol }).expect(400);
		expect(response.body).toEqual({
			error: { code: 400, message: 'BAD REQUEST', description: 'Currency is invalid' },
		});
	}
);

test('POST duplicate currency preserves its existing error response', async () => {
	const context = await loadHttpApp();
	const response = await context.api.post(`${base}/currency`).send({ symbol: 'BTC' }).expect(400);
	expect(response.body).toEqual({
		error: {
			code: 400,
			message: 'BAD REQUEST',
			description: 'Currency symbol BTC already exists',
		},
	});
});

test.each([
	[[], 404, 'currency not found'],
	[
		[{ symbol: 'NEW', name: 'New Coin', market_cap_rank: 0 }],
		400,
		'NEW has no market_cap_rank, market_cap_rank_allowed <= 66',
	],
	[
		[{ symbol: 'NEW', name: 'New Coin', market_cap_rank: 67 }],
		400,
		'NEW market_cap_rank = 67, allowed <= 66',
	],
])('POST currency preserves lookup/rank validation for %j', async (coins, status, description) => {
	const context = await loadHttpApp({ exchange: [{ data: { coins } }] });
	const response = await context.api
		.post(`${base}/currency`)
		.send({ symbol: 'NEW' })
		.expect(status);
	expect(response.body.error).toMatchObject({ code: status, description });
});

test('POST currency response-error ReferenceError still serializes as an empty 500 object', async () => {
	const context = await loadHttpApp({
		exchange: [
			{
				error: Object.assign(new Error('B3 currency HTTP error'), {
					response: { status: 503 },
				}),
			},
		],
	});
	const response = await context.api.post(`${base}/currency`).send({ symbol: 'NEW' }).expect(500);
	expect(response.body).toEqual({});
});

test('POST arbitrage preserves actual model IDs/dates/transactions in JSON without a database', async () => {
	const context = await loadHttpApp();
	context.planSave('Arbitrage');
	const response = await context.api.post(`${base}/arbitrages`).send(historical[0]).expect(200);
	expect(response.type).toBe('application/json');
	expect(response.body).toEqual(historical[0]);
});

test.each(['absent', 'non-JSON'])(
	'POST arbitrage %s body is currently accepted as an empty model',
	async kind => {
		const context = await loadHttpApp();
		context.planSave('Arbitrage');
		const request = context.api.post(`${base}/arbitrages`);
		if (kind === 'non-JSON') request.set('Content-Type', 'text/plain').send('not JSON');
		const response = await request.expect(200);
		expect(response.body.transactions).toEqual([]);
		const { _id: id } = response.body;
		expect(id).toMatch(/^[a-f0-9]{24}$/);
		expect(response.body.profitPercentage).toBeUndefined();
	}
);
