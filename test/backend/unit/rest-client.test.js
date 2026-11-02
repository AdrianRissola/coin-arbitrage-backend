const axios = require('axios');
const client = require('../../../marketRestClient');
const { market, controlAxios, now } = require('../support/b2-fixtures.cjs');
const legacy = require('../support/legacy-rest.cjs');
const { MARKETS } = require('../../testHelper');

let transport;
let errorLog;
beforeEach(() => {
	jest.useFakeTimers({ now: new Date(now), doNotFake: ['performance'] });
	jest.spyOn(console, 'log').mockImplementation(() => {});
	errorLog = jest.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
	if (transport) transport.close();
	transport = null;
	expect(jest.getTimerCount()).toBe(0);
	jest.useRealTimers();
});

test('a literal native ticker oracle reaches the real client and extraction helper', async () => {
	transport = controlAxios(axios, [{ data: { price: '80' } }]);
	const result = await client.getMarketPrice(market(), 'alphabtcusdt');
	expect(result).toEqual({
		platform: 'Alpha',
		ticker: 'alphabtcusdt',
		price: 80,
		date: new Date(now),
	});
});

test.each(legacy.cases)(
	'%s/%s retains its real legacy URL, extraction path and native ticker',
	async (name, ticker, native, url) => {
		transport = controlAxios(axios, [{ data: legacy.bodies[name] }]);
		const config = MARKETS.find(value => value.name === name);
		const result = await client.getMarketPrice(
			config,
			config.availableTickersToMarketTickers[ticker]
		);
		expect({ calls: transport.calls, result }).toEqual({
			calls: [{ method: 'get', url }],
			result: { platform: name, ticker: native, price: 80, date: new Date(now) },
		});
	}
);

test('the ticker response is the actual Axios response with marketName added in place', async () => {
	transport = controlAxios(axios, [{ data: { price: '80', other: ['literal'] } }]);
	const response = await client.getTickerByMarket(market(), 'native');
	expect(response).toBe(transport.responses[0]);
	expect(response).toMatchObject({
		marketName: 'Alpha',
		status: 200,
		data: { price: '80', other: ['literal'] },
	});
	expect(transport.calls).toEqual([
		{ method: 'get', url: 'https://alpha.invalid/ticker/native' },
	]);
});

test.each([null, undefined, '', false, 0])(
	'missing native mapping %p returns null without HTTP',
	async native => {
		transport = controlAxios(axios, []);
		await expect(client.getTickerByMarket(null, native)).resolves.toBeNull();
		await expect(client.getMarketPrice(market(), native)).resolves.toBeNull();
	}
);

test('a missing market returns no price without HTTP', async () => {
	transport = controlAxios(axios, []);
	await expect(client.getMarketPrice(null, 'native')).resolves.toBeNull();
});

test('malformed REST configuration keeps its native TypeError before any HTTP request', async () => {
	transport = controlAxios(axios, []);
	await expect(client.getTickerByMarket({ name: 'Broken' }, 'native')).rejects.toThrow(TypeError);
});

test('URL building still concatenates literally and replaces only the first placeholder', async () => {
	const config = market();
	config.com.api.rest.base = 'https://alpha.invalid/base';
	config.com.api.rest.tickerPath = `\${ticker}/\${ticker}`;
	transport = controlAxios(axios, [{ data: { price: 80 } }]);
	await client.getTickerByMarket(config, 'native');
	expect(transport.calls).toEqual([
		{ method: 'get', url: `https://alpha.invalid/basenative/\${ticker}` },
	]);
});

test('split ticker placeholders use the configured separator and real extraction helper', async () => {
	const config = market();
	config.com.api.rest.pathToPrice = ['data', `\${ticker}.0`, `\${ticker}.1`];
	transport = controlAxios(axios, [{ data: { BTC: { USDT: '125' } } }]);
	await expect(client.getMarketPrice(config, 'BTC-USDT')).resolves.toEqual({
		platform: 'Alpha',
		ticker: 'BTC-USDT',
		price: 125,
		date: new Date(now),
	});
});

test('price extraction still works when tickerPattern is absent', async () => {
	const config = market();
	delete config.com.api.rest.tickerPattern;
	transport = controlAxios(axios, [{ data: { price: '80' } }]);
	await expect(client.getMarketPrice(config, 'native')).resolves.toMatchObject({ price: 80 });
});

test.each(['0', 'not-a-number', null])(
	'falsey/invalid price %p keeps the existing extraction error',
	async price => {
		transport = controlAxios(axios, [{ data: { price } }]);
		await expect(client.getMarketPrice(market(), 'native')).rejects.toEqual({
			code: 400,
			message: 'BAD REQUEST',
			description:
				'Error when try to extract value from target using pathToValue: data,price',
		});
	}
);

test.each([
	[
		{ response: { status: 503 } },
		400,
		'BAD REQUEST',
		'controlled failure when: GET https://alpha.invalid/ticker/native',
	],
	[{ request: {} }, 400, 'BAD REQUEST', 'controlled failure'],
	[{}, 500, 'INTERNAL SERVER ERROR', 'controlled failure'],
])(
	'response/request/setup errors preserve the actual envelope for %j',
	async (properties, code, message, description) => {
		transport = controlAxios(axios, [
			{ error: Object.assign(new Error('controlled failure'), properties) },
		]);
		await expect(client.getTickerByMarket(market(), 'native')).rejects.toEqual({
			code,
			message,
			description,
		});
		expect(errorLog).toHaveBeenCalledWith('controlled failure');
	}
);
