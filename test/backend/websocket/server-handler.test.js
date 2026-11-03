const { captureTimers, connection, deliver } = require('../support/ws-runtime.cjs');
const { deferred } = require('../support/b2-fixtures.cjs');

let clock;
let service;
let client;
let handler;
let requests;
const accept = (...origins) => {
	const origin = origins.length ? origins[0] : 'http://local.invalid';
	const socket = connection('browser.invalid');
	const request = { origin, accept: jest.fn(() => socket), reject: jest.fn() };
	handler.onRequest({}, request);
	requests.push({ request, socket });
	return { request, socket };
};
const load = (mode = 'test') => {
	process.env.NODE_ENV = mode;
	jest.isolateModules(() => {
		handler = jest.requireActual('../../../webSocketServerHandler');
	});
};
const environment = {};
beforeEach(() => {
	['NODE_ENV', 'LOCAL_ALLOWED_ORIGINS', 'PROD_ALLOWED_ORIGINS'].forEach(key => {
		environment[key] = process.env[key];
	});
	process.env.LOCAL_ALLOWED_ORIGINS = '["http://local.invalid"]';
	process.env.PROD_ALLOWED_ORIGINS = '["https://production.invalid"]';
	jest.spyOn(console, 'log').mockImplementation(() => {});
	clock = captureTimers();
	requests = [];
	service = {
		getArbitrageChannelInfo: jest.fn(async ticker => ({
			channel: 'arbitrage',
			ticker,
			handlerOnly: true,
		})),
		getMarketsChannelInfo: jest.fn(async () => ({
			connectedMarkets: ['alpha.invalid'],
			disconnectedMarkets: [],
		})),
	};
	client = { openAndSend: jest.fn(async () => ({})), close: jest.fn() };
	jest.doMock('../../../service/webSocketServerService', () => service);
	jest.doMock('../../../service/webSocketClientService', () => client);
	jest.doMock('../../../marketsDBmanager', () => ({
		getAllAvailableTickers: () => [{ name: 'BTC-USDT' }, { name: 'ETH-USD' }],
	}));
	load();
});
afterEach(() => {
	requests.forEach(({ socket }) => socket.removeAllListeners());
	clock.close();
	Object.entries(environment).forEach(([key, value]) => {
		if (value === undefined) delete process.env[key];
		else process.env[key] = value;
	});
});

test('local allowed origins accept exactly and emit the literal welcome shape', () => {
	const { request, socket } = accept();
	expect(request.accept).toHaveBeenCalledWith(null, 'http://local.invalid');
	expect(JSON.parse(socket.sent[0])).toEqual({
		response: 'http://local.invalid welcome to real-time monitor',
	});
});
test.each([
	'http://local.invalid/',
	'https://local.invalid',
	'http://evil.invalid',
	undefined,
	null,
])('origin %p is rejected without handlers or welcome', origin => {
	const { request, socket } = accept(origin);
	expect(request.reject).toHaveBeenCalledTimes(1);
	expect(socket.sent).toEqual([]);
	expect(socket.eventNames()).toEqual([]);
});
test('production uses its own exact origin allowlist', () => {
	load('production');
	expect(accept('http://local.invalid').request.reject).toHaveBeenCalledTimes(1);
	expect(accept('https://production.invalid').request.accept).toHaveBeenCalledTimes(1);
});
test('invalid origin configuration throws before accepting a connection', () => {
	process.env.LOCAL_ALLOWED_ORIGINS = 'not json';
	expect(() => load()).toThrow(SyntaxError);
});
test('accepted clients receive independent monotonically increasing connection IDs', () => {
	expect([accept().socket.id, accept().socket.id]).toEqual([0, 1]);
});
test('invalid JSON returns both error strings without opening exchange feeds', async () => {
	const { socket } = accept();
	await deliver(socket, 'not json');
	expect(JSON.parse(socket.sent[1])).toEqual([
		expect.stringMatching(/^invalid json:/),
		'invalid request: channel and ticker fields are mandatory',
	]);
	expect(client.openAndSend).not.toHaveBeenCalled();
});
test.each(['binary', 'ping', 'close'])(
	'%s payloads are ignored without parsing JSON',
	async type => {
		const { socket } = accept();
		await deliver(socket, 'not json', type);
		expect(socket.sent).toHaveLength(1);
		expect(clock.intervals.size).toBe(0);
	}
);
test('arbitrage starts only a 1000ms interval after feed opening settles', async () => {
	const gate = deferred();
	client.openAndSend.mockReturnValue(gate.promise);
	const { socket } = accept();
	const pending = deliver(socket, { channel: 'arbitrage', ticker: 'btc-usdt' });
	expect(clock.intervals.size).toBe(0);
	gate.resolve({});
	await pending;
	expect(client.openAndSend).toHaveBeenCalledWith({ tickers: ['btc-usdt'] });
	expect(socket.sent).toHaveLength(1);
	const [timer] = clock.intervals.keys();
	expect(timer.delay).toBe(1000);
	await clock.run(timer);
	expect(service.getArbitrageChannelInfo).toHaveBeenCalledWith('btc-usdt');
	expect(JSON.parse(socket.sent[1])).toEqual({
		channel: 'arbitrage',
		ticker: 'btc-usdt',
		handlerOnly: true,
	});
});
test.each(['all', 'ALL', 'aLl'])(
	'ticker %s expands real manager names before opening feeds',
	async ticker => {
		const { socket } = accept();
		await deliver(socket, { channel: 'bestArbitrage', ticker });
		expect(client.openAndSend).toHaveBeenCalledWith({ tickers: ['BTC-USDT', 'ETH-USD'] });
	}
);
test('frontend capital Markets with no ticker is a valid subscription', async () => {
	const { socket } = accept();
	await deliver(socket, { channel: 'Markets' });
	const [timer] = clock.intervals.keys();
	await clock.run(timer);
	expect(client.openAndSend).not.toHaveBeenCalled();
	expect(JSON.parse(socket.sent[1])).toEqual({
		channel: 'markets',
		markets: { connectedMarkets: ['alpha.invalid'], disconnectedMarkets: [] },
	});
});
test.each(['markets', 'Arbitrage', 'bestarbitrage', 'unknown'])(
	'case-sensitive/unknown channel %s opens feeds but creates no update interval',
	async channel => {
		const { socket } = accept();
		await deliver(socket, { channel, ticker: 'BTC-USDT' });
		expect(client.openAndSend).toHaveBeenCalledTimes(1);
		expect(clock.intervals.size).toBe(0);
	}
);
test.each(
	[
		null,
		[],
		['arbitrage', 'BTC-USDT'],
		3,
		0,
		true,
		false,
		'',
		'arbitrage',
		{},
		{ ticker: 'BTC-USDT' },
		...[undefined, null, '', '   ', 42, true, [], {}].map(channel => ({
			channel,
			ticker: 'BTC-USDT',
		})),
		...['arbitrage', 'bestArbitrage', 'Markets', 'unknown'].flatMap(channel =>
			[null, '', '   ', 0, 42, true, false, [], {}].map(ticker => ({ channel, ticker }))
		),
		...['arbitrage', 'bestArbitrage', 'unknown'].map(channel => ({ channel })),
	].map(payload => [payload])
)(
	'invalid request %j returns an error without opening feeds or scheduling updates',
	async payload => {
		const { socket } = accept();
		await expect(deliver(socket, JSON.stringify(payload))).resolves.toBeUndefined();
		expect(JSON.parse(socket.sent[1])).toEqual([
			'invalid request: channel and ticker fields are mandatory',
		]);
		expect(client.openAndSend).not.toHaveBeenCalled();
		expect(clock.intervals.size).toBe(0);
		expect(service.getArbitrageChannelInfo).not.toHaveBeenCalled();
		expect(service.getMarketsChannelInfo).not.toHaveBeenCalled();
	}
);
test.each([null, { channel: 'arbitrage' }, { channel: 'Markets', ticker: [] }])(
	'invalid request %j preserves an existing valid subscription',
	async payload => {
		const { socket } = accept();
		await deliver(socket, { channel: 'arbitrage', ticker: 'BTC-USDT' });
		const [timer] = clock.intervals.keys();
		await deliver(socket, payload);
		expect(JSON.parse(socket.sent[1])).toEqual([
			'invalid request: channel and ticker fields are mandatory',
		]);
		expect([...clock.intervals.keys()]).toEqual([timer]);
		expect(client.openAndSend).toHaveBeenCalledTimes(1);
		await clock.run(timer);
		expect(JSON.parse(socket.sent[2])).toEqual({
			channel: 'arbitrage',
			ticker: 'BTC-USDT',
			handlerOnly: true,
		});
	}
);
test('a connection accepts a valid subscription after rejecting an invalid request', async () => {
	const { socket } = accept();
	await deliver(socket, null);
	await deliver(socket, { channel: 'arbitrage', ticker: 'BTC-USDT' });
	expect(client.openAndSend).toHaveBeenCalledWith({ tickers: ['BTC-USDT'] });
	expect(clock.intervals.size).toBe(1);
	await clock.run([...clock.intervals.keys()][0]);
	expect(JSON.parse(socket.sent[2]).ticker).toBe('BTC-USDT');
});
test('different subscriptions clear known interval fields before installing the replacement', async () => {
	const { socket } = accept();
	await deliver(socket, { channel: 'arbitrage', ticker: 'BTC-USDT' });
	const previous = socket.arbitrageIntervalId;
	await deliver(socket, { channel: 'Markets' });
	expect(clock.intervals.has(previous)).toBe(false);
	expect(clock.intervals.size).toBe(1);
});
test.each([
	{ channel: 'arbitrage', ticker: 'BTC-USDT' },
	{ channel: 'bestArbitrage', ticker: 'ALL' },
	{ channel: 'Markets' },
])('identical subscriptions %j keep one interval and disconnect clears it', async request => {
	const { socket } = accept();
	await deliver(socket, request);
	const [first] = clock.intervals.keys();
	await deliver(socket, request);
	expect(clock.intervals.has(first)).toBe(false);
	expect(clock.intervals.size).toBe(1);
	socket.close();
	expect(clock.intervals.size).toBe(0);
	expect(client.close).not.toHaveBeenCalled();
});
test('independent browsers changing channels do not clear each other intervals', async () => {
	const first = accept().socket;
	const second = accept().socket;
	await deliver(first, { channel: 'arbitrage', ticker: 'BTC-USDT' });
	const timer = first.arbitrageIntervalId;
	await deliver(second, { channel: 'arbitrage', ticker: 'ETH-USD' });
	await deliver(second, { channel: 'Markets' });
	expect(clock.intervals.has(timer)).toBe(true);
	expect(clock.intervals.size).toBe(2);
});
test('arbitrage failures are caught and cancel the current interval', async () => {
	const { socket } = accept();
	service.getArbitrageChannelInfo.mockRejectedValue(new Error('controlled service failure'));
	await deliver(socket, { channel: 'arbitrage', ticker: 'BTC-USDT' });
	await clock.run(socket.arbitrageIntervalId);
	expect(clock.intervals.size).toBe(0);
});
test.each([
	{ channel: 'arbitrage', ticker: 'BTC-USDT' },
	{ channel: 'bestArbitrage', ticker: 'ALL' },
	{ channel: 'Markets' },
])('a closed connection skips %j work and cancels its interval', async request => {
	const { socket } = accept();
	await deliver(socket, request);
	const [timer] = clock.intervals.keys();
	socket.connected = false;
	await clock.run(timer);
	expect(clock.intervals.size).toBe(0);
	expect(socket.sendUTF).toHaveBeenCalledTimes(1);
	expect(service.getArbitrageChannelInfo).not.toHaveBeenCalled();
	expect(service.getMarketsChannelInfo).not.toHaveBeenCalled();
});
test('disconnect clears every per-connection interval field', () => {
	const { socket } = accept();
	['arbitrageIntervalId', 'priceIntervalId', 'historicalIntervalId', 'marketsIntervalId'].forEach(
		field => {
			socket[field] = setInterval(jest.fn(), 1000);
		}
	);
	socket.close();
	expect(clock.intervals.size).toBe(0);
	expect(client.close).not.toHaveBeenCalled();
});
test('Markets callback failure cancels its interval without an unhandled rejection', async () => {
	const { socket } = accept();
	await deliver(socket, { channel: 'Markets' });
	service.getMarketsChannelInfo.mockRejectedValue(new Error('controlled markets failure'));
	await expect(clock.run(socket.marketsIntervalId)).resolves.toBeUndefined();
	expect(clock.intervals.size).toBe(0);
	expect(socket.sendUTF).toHaveBeenCalledTimes(1);
});
test.each([
	{ channel: 'arbitrage', ticker: 'BTC-USDT' },
	{ channel: 'bestArbitrage', ticker: 'ALL' },
	{ channel: 'Markets' },
])('disconnect during pending %j work prevents a late send', async request => {
	const gate = deferred();
	service.getArbitrageChannelInfo.mockReturnValue(gate.promise);
	service.getMarketsChannelInfo.mockReturnValue(gate.promise);
	const { socket } = accept();
	await deliver(socket, request);
	const pending = clock.run([...clock.intervals.keys()][0]);
	socket.close();
	gate.resolve({});
	await pending;
	expect(clock.intervals.size).toBe(0);
	expect(socket.sendUTF).toHaveBeenCalledTimes(1);
	expect(client.close).not.toHaveBeenCalled();
});
test.each(
	[
		{ channel: 'arbitrage', ticker: 'BTC-USDT' },
		{ channel: 'bestArbitrage', ticker: 'ALL' },
		{ channel: 'Markets' },
	].flatMap(request => [false, true].map(reject => [request, reject]))
)(
	'replacing pending %j work (reject=%s) preserves the new timer and sends no stale frame',
	async (request, reject) => {
		const gate = deferred();
		service.getArbitrageChannelInfo.mockReturnValue(gate.promise);
		service.getMarketsChannelInfo.mockReturnValue(gate.promise);
		const { socket } = accept();
		await deliver(socket, request);
		const pending = clock.run([...clock.intervals.keys()][0]);
		await deliver(
			socket,
			request.channel === 'Markets'
				? { channel: 'arbitrage', ticker: 'ETH-USDT' }
				: { channel: 'Markets' }
		);
		const [replacement] = clock.intervals.keys();
		if (reject) gate.reject(new Error('controlled obsolete callback failure'));
		else gate.resolve({});
		await expect(pending).resolves.toBeUndefined();
		expect([...clock.intervals.keys()]).toEqual([replacement]);
		expect(socket.sendUTF).toHaveBeenCalledTimes(1);
	}
);
test('disconnect during feed opening does not install an interval after closing', async () => {
	const gate = deferred();
	client.openAndSend.mockReturnValue(gate.promise);
	const { socket } = accept();
	const pending = deliver(socket, { channel: 'arbitrage', ticker: 'BTC-USDT' });
	socket.close();
	gate.resolve({});
	await pending;
	expect(clock.intervals.size).toBe(0);
	expect(client.close).not.toHaveBeenCalled();
});
test('a replacement cancels the old interval before waiting for feed opening', async () => {
	const { socket } = accept();
	await deliver(socket, { channel: 'Markets' });
	const gate = deferred();
	client.openAndSend.mockReturnValue(gate.promise);
	const pending = deliver(socket, { channel: 'arbitrage', ticker: 'BTC-USDT' });
	const duringOpening = clock.intervals.size;
	gate.resolve({});
	await pending;
	expect(duringOpening).toBe(0);
	expect(clock.intervals.size).toBe(1);
});
test.each(['BTC-USDT', 'ETH-USDT'])(
	'older feed opening cannot replace or duplicate the latest %s subscription',
	async ticker => {
		const older = deferred();
		const newer = deferred();
		client.openAndSend.mockReturnValueOnce(older.promise).mockReturnValueOnce(newer.promise);
		const { socket } = accept();
		const first = deliver(socket, { channel: 'arbitrage', ticker: 'BTC-USDT' });
		const second = deliver(socket, { channel: 'arbitrage', ticker });
		newer.resolve({});
		await second;
		const [latest] = clock.intervals.keys();
		older.resolve({});
		await first;
		expect([...clock.intervals.keys()]).toEqual([latest]);
		await clock.run(latest);
		expect(service.getArbitrageChannelInfo).toHaveBeenCalledWith(ticker);
	}
);
test('feed opening rejection propagates and does not install an interval', async () => {
	const { socket } = accept();
	client.openAndSend.mockRejectedValue(new Error('controlled feed failure'));
	await expect(deliver(socket, { channel: 'arbitrage', ticker: 'BTC-USDT' })).rejects.toThrow(
		'controlled feed failure'
	);
	expect(clock.intervals.size).toBe(0);
});
