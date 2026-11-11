const { loadHttpApp } = require('../support/http-app.cjs');
const golden = require('../../fixtures/contracts/v1/arbitrages.json');
const errors = require('../../fixtures/contracts/v1/errors.json');
const { clone, now } = require('../support/b2-fixtures.cjs');

const base = '/coin-arbitrage/crypto';
const plans = (values = [80, 100, 125]) =>
	values.map(price => ({
		data: { price: String(price), bid: String(price), ask: String(price) },
	}));
const normalized = rows =>
	rows.map(row => {
		expect(row.date).toMatch(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/);
		expect(Number.isFinite(Date.parse(row.date))).toBe(true);
		return { ...row, date: now };
	});

test('GET single market ticker uses case-insensitive lookup and real raw Axios response data', async () => {
	const context = await loadHttpApp({ exchange: plans([80]) });
	const response = await context.api.get(`${base}/markets/alpha/tickers/btc-usdt`).expect(200);
	expect(response.body).toEqual({ price: '80', bid: '80', ask: '80' });
	expect(context.transport.calls).toEqual([
		{ method: 'get', url: 'https://alpha.invalid/ticker/BTC-USDT' },
	]);
});

test.each([
	['missing', 'BTC-USDT', 'market missing not found'],
	['Alpha', 'missing', 'ticker missing not found'],
])(
	'GET single ticker %s/%s preserves actual NOT_FOUND envelope',
	async (market, ticker, description) => {
		const context = await loadHttpApp();
		const response = await context.api
			.get(`${base}/markets/${market}/tickers/${ticker}`)
			.expect(404);
		expect(response.body).toEqual({ error: { code: 404, message: 'NOT FOUND', description } });
		expect(context.transport.calls).toEqual([]);
	}
);

test('GET all market tickers maps real adapter bodies by their market names', async () => {
	const context = await loadHttpApp({ exchange: plans() });
	const response = await context.api.get(`${base}/markets/btc-usdt`).expect(200);
	expect(response.body).toEqual({
		Alpha: { price: '80', bid: '80', ask: '80' },
		Beta: { price: '100', bid: '100', ask: '100' },
		Gamma: { price: '125', bid: '125', ask: '125' },
	});
});

test('GET all prices sorts numeric values and exposes current native ticker field', async () => {
	const context = await loadHttpApp({ exchange: plans([125, 80, 100]) });
	const response = await context.api.get(`${base}/markets/tickers/btc-usdt/prices`).expect(200);
	expect(normalized(response.body)).toEqual([
		{ platform: 'Beta', ticker: 'BTC-USDT', price: 80, bid: 80, ask: 80, date: now },
		{ platform: 'Gamma', ticker: 'BTC-USDT', price: 100, bid: 100, ask: 100, date: now },
		{ platform: 'Alpha', ticker: 'BTC-USDT', price: 125, bid: 125, ask: 125, date: now },
	]);
});

test('GET prices for an unsupported ticker returns an empty JSON array', async () => {
	const context = await loadHttpApp();
	expect(
		(await context.api.get(`${base}/markets/tickers/MISSING/prices`).expect(200)).body
	).toEqual([]);
});

test.each(['BTC-USDT', 'BTC-USD'])(
	'GET current arbitrages %s matches independent complete financial literals',
	async ticker => {
		const context = await loadHttpApp({ exchange: plans() });
		const response = await context.api
			.get(`${base}/current-arbitrages`)
			.query({ ticker })
			.expect(200);
		const expected = clone(golden).map(row => ({
			...row,
			transactions: row.transactions.map(transaction => ({ ...transaction, pair: ticker })),
		}));
		expect(normalized(response.body)).toEqual(expected);
	}
);

test('GET current arbitrages ignores Last-only prices when no Ask/Bid quotes are returned', async () => {
	const context = await loadHttpApp({
		exchange: [80, 100, 125].map(price => ({ data: { price: String(price) } })),
	});
	const response = await context.api
		.get(`${base}/current-arbitrages`)
		.query({ ticker: 'BTC-USDT' })
		.expect(200);
	expect(response.body).toEqual([]);
});

test('GET current requested subset retains actual market inclusion and complete financial answer', async () => {
	const context = await loadHttpApp({ exchange: plans([80, 125]) });
	const response = await context.api
		.get(`${base}/current-arbitrages?ticker=BTC-USDT&markets=alpha,Gamma`)
		.expect(200);
	expect(normalized(response.body)).toEqual([golden[0]]);
});

test.each([
	['20', undefined, [0, 1, 2]],
	['20.001', undefined, [0, 1, 2]],
	['25', undefined, [0, 1, 2]],
	['25.001', undefined, [0]],
	['56.25', undefined, [0]],
	['56.251', undefined, []],
	['100', '1', [0]],
	[undefined, '2', [0, 1]],
	[undefined, '3', [0, 1, 2]],
	['not-a-number', 'not-a-number', [0, 1, 2]],
])(
	'GET current min=%s/top=%s preserves coercion, inclusive thresholds and top-one bypass',
	async (minimum, top, indices) => {
		const context = await loadHttpApp({ exchange: plans() });
		const query = { ticker: 'BTC-USDT' };
		if (minimum !== undefined) query.minProfitPercentage = minimum;
		if (top !== undefined) query.top = top;
		const response = await context.api
			.get(`${base}/current-arbitrages`)
			.query(query)
			.expect(200);
		expect(normalized(response.body)).toEqual(indices.map(index => golden[index]));
	}
);

test.each(errors)('GET validation fixture $name returns its actual error contract', async entry => {
	const context = await loadHttpApp();
	const response = await context.api.get(entry.path).expect(entry.status);
	expect(response.type).toBe('application/json');
	expect(response.body).toEqual(entry.body);
});

test('GET current unknown requested markets returns literal JSON null, not a no-data object', async () => {
	const context = await loadHttpApp();
	const response = await context.api
		.get(`${base}/current-arbitrages?ticker=BTC-USDT&markets=Missing,Unknown`)
		.expect(200);
	expect(response.type).toBe('application/json');
	expect(response.text).toBe('null');
});

test('GET raw adapter response errors retain the real downstream BAD_REQUEST envelope', async () => {
	const context = await loadHttpApp({
		exchange: [
			{
				error: Object.assign(new Error('B3 exchange rejected'), {
					response: { status: 503 },
				}),
			},
		],
	});
	const response = await context.api.get(`${base}/markets/Alpha/tickers/BTC-USDT`).expect(400);
	expect(response.body).toEqual({
		error: {
			code: 400,
			message: 'BAD REQUEST',
			description: 'B3 exchange rejected when: GET https://alpha.invalid/ticker/BTC-USDT',
		},
	});
});
