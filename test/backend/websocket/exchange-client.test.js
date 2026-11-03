const {
	captureTimers,
	connection,
	deliver,
	exchangeMarket,
	loadExchange,
} = require('../support/ws-runtime.cjs');
const { now } = require('../support/b2-fixtures.cjs');

let clock;
let context;
let market;
const open = async (overrides = {}, tickers = ['BTC-USDT']) => {
	market = exchangeMarket('Alpha', overrides);
	context.manager.setMarketsFromDB([market]);
	await context.module.connectAndSend([market], tickers);
	const socket = connection('alpha.invalid');
	context.clients[0].emit('connect', socket);
	return socket;
};
beforeEach(() => {
	jest.useFakeTimers({ now: new Date(now), doNotFake: ['performance'] });
	jest.spyOn(console, 'log').mockImplementation(() => {});
	clock = captureTimers();
	context = loadExchange();
});
afterEach(async () => {
	try {
		await context?.module.close({ allMarkets: true });
		expect(clock?.timeouts.size).toBe(0);
		expect(clock?.intervals.size).toBe(0);
	} finally {
		clock?.close();
		jest.useRealTimers();
	}
});

test('real exchange module replaces host/ticker templates and uses UTF8 by default', async () => {
	const socket = await open();
	expect(context.clients[0].connect).toHaveBeenCalledWith('wss://alpha.invalid/feed');
	expect(socket.sent).toEqual(['{"symbol":"BTC-USDT"}']);
	expect(context.module.getWebSocketConnections()['alpha.invalid']).toMatchObject({
		connected: true,
	});
});
test('configured binary send receives the actual UTF8 Buffer', async () => {
	const socket = await open({ sendFunction: 'sendBytes' });
	expect(socket.sendUTF).not.toHaveBeenCalled();
	expect(socket.sent).toEqual([Buffer.from('{"symbol":"BTC-USDT"}')]);
});
test('market-specific symbols and casing are converted by the real helper', async () => {
	const socket = await open({
		tickerPattern: {
			separator: '/',
			prefix: 't',
			currencies: [{ symbol: 'BTC', marketSymbol: 'XBT' }],
			baseCurrencyCaseFunction: 'toLowerCase',
			quoteCurrencyCaseFunction: 'toLowerCase',
		},
	});
	expect(socket.sent).toEqual(['{"symbol":"tXBT/usdt"}']);
});
test.each(['utf8', 'binary'])(
	'%s messages use real parsing/extraction and populate stream prices',
	async type => {
		const socket = await open();
		await deliver(socket, { symbol: 'BTC-USDT', price: '80.5' }, type);
		const record = context.module.getAllMarketTickerStream()['alpha.invalid'];
		expect(record).toMatchObject({
			connected: true,
			data: {
				ticker: 'BTC-USDT',
				tickerPrices: { 'BTC-USDT': 80.5 },
				price: 80.5,
				timestamp: new Date(now),
			},
		});
		expect(record.rawData).toBe(
			type === 'utf8' ? '{"symbol":"BTC-USDT","price":"80.5"}' : undefined
		);
	}
);
test.each(['utf8', 'binary'])(
	'malformed %s JSON rejects before the production extraction catch',
	async type => {
		const socket = await open();
		await expect(deliver(socket, 'not json', type)).rejects.toThrow(SyntaxError);
		expect(context.module.getAllMarketTickerStream()).toEqual({});
	}
);
test.each([0, null, undefined, 'not a price'])(
	'invalid price %p is swallowed without adding a stream record',
	async price => {
		const socket = await open();
		await deliver(socket, { symbol: 'BTC-USDT', price });
		expect(context.module.getAllMarketTickerStream()).toEqual({});
	}
);
test('unsupported message types do not parse their invalid payload', async () => {
	const socket = await open();
	await deliver(socket, 'not json', 'ping');
	expect(context.module.getAllMarketTickerStream()).toEqual({});
});
test('availability predicate failure is swallowed by the existing message catch', async () => {
	const socket = await open({ isAvailablePairCurrencyFn: { code: '() => false' } });
	await deliver(socket, { symbol: 'BTC-USDT', price: 80 });
	expect(context.module.getAllMarketTickerStream()).toEqual({});
});
test('missing symbol is swallowed rather than inventing a ticker', async () => {
	const socket = await open();
	await deliver(socket, { price: 80 });
	expect(context.module.getAllMarketTickerStream()).toEqual({});
});
test('subscription-ID acknowledgements retain independent ticker-price associations', async () => {
	const socket = await open({ pathToTicker: [], pathToSubscriptionId: ['id'] });
	await deliver(socket, { id: 7 });
	await deliver(socket, { id: 7, price: 80 });
	await context.module.connectAndSend([market], ['ETH-USD']);
	await deliver(socket, { id: 9 });
	await deliver(socket, { id: 9, price: 100 });
	await deliver(socket, { id: 7, price: 81 });
	expect(context.module.getAllMarketTickerStream()['alpha.invalid'].data).toMatchObject({
		ticker: 'ETH-USD',
		tickerPrices: { 'BTC-USDT': 81, 'ETH-USD': 100 },
		subscriptionId: { 7: 'ETH-USD', 9: 'ETH-USD' },
	});
	expect(context.clients).toHaveLength(1);
});
test('ID synchronous queue remains undrained under the production tikcers/length mismatch', async () => {
	const socket = await open({ pathToTicker: [], pathToSubscriptionId: ['id'] }, [
		'BTC-USDT',
		'ETH-USD',
	]);
	await deliver(socket, { id: 1, price: 80 });
	expect(socket.sent).toEqual(['{"symbol":"BTC-USDT"}']);
});
test('an unknown subscription ID is swallowed without creating a price record', async () => {
	const socket = await open({ pathToTicker: [], pathToSubscriptionId: ['id'] });
	await deliver(socket, { price: 80 });
	expect(context.module.getAllMarketTickerStream()).toEqual({});
});
test('repeated host connects do not construct a second client while connecting or open', async () => {
	market = exchangeMarket();
	context.manager.setMarketsFromDB([market]);
	await context.module.connectAndSend([market], ['BTC-USDT']);
	await context.module.connectAndSend([market], ['BTC-USDT']);
	const socket = connection('alpha.invalid');
	context.clients[0].emit('connect', socket);
	await context.module.connectAndSend([market], ['BTC-USDT']);
	expect(context.clients).toHaveLength(1);
	expect(socket.sent).toEqual(['{"symbol":"BTC-USDT"}', '{"symbol":"BTC-USDT"}']);
});
test('unsupported ticker sends no subscription but still opens its configured host', async () => {
	const socket = await open({}, ['LTC-USDT']);
	expect(socket.sent).toEqual([]);
	expect(context.clients[0].connect).toHaveBeenCalledTimes(1);
});
test('ping cadence is frequency minus one second and disconnected ticks cancel it', async () => {
	const socket = await open({ pingFrequencyInSeconds: 3 });
	const [timer] = clock.intervals.keys();
	expect(timer.delay).toBe(2000);
	await clock.run(timer);
	expect(socket.sent.at(-1)).toBe('ping');
	socket.connected = false;
	await clock.run(timer);
	expect(clock.intervals.size).toBe(0);
});
test('one-second configured ping frequency currently schedules a zero-delay interval', async () => {
	await open({ pingFrequencyInSeconds: 1 });
	expect([...clock.intervals.keys()].map(timer => timer.delay)).toEqual([0]);
});
test('error clears only latest price, preserving per-ticker prices and connected flag as supplied', async () => {
	const socket = await open();
	await deliver(socket, { symbol: 'BTC-USDT', price: 80 });
	socket.emit('error', new Error('controlled error'));
	expect(context.module.getAllMarketTickerStream()['alpha.invalid']).toMatchObject({
		connected: true,
		data: { price: null, tickerPrices: { 'BTC-USDT': 80 } },
	});
});
test('close clears stream prices/ping, schedules one 30-second retry and close-all cancels it', async () => {
	const socket = await open({ pingFrequencyInSeconds: 3 });
	await deliver(socket, { symbol: 'BTC-USDT', price: 80 });
	socket.close();
	socket.emit('close');
	expect(context.module.getAllMarketTickerStream()['alpha.invalid']).toMatchObject({
		connected: false,
		data: { price: null, tickerPrices: null },
	});
	expect(clock.intervals.size).toBe(0);
	expect([...clock.timeouts.keys()].map(timer => timer.delay)).toEqual([30000]);
	await context.module.close({ allMarkets: true });
	expect(clock.timeouts.size).toBe(0);
});
test('failed hosts retry independently without reconnecting healthy hosts', async () => {
	const markets = [exchangeMarket('Alpha'), exchangeMarket('Beta')];
	context.manager.setMarketsFromDB(markets);
	await context.module.connectAndSend(markets, ['BTC-USDT']);
	const healthy = connection('beta.invalid');
	context.clients[1].emit('connect', healthy);
	context.clients[0].emit('connectFailed', new Error('controlled dial failure'));
	context.clients[0].emit('connectFailed', new Error('duplicate failure'));
	expect(clock.timeouts.size).toBe(1);
	await clock.run([...clock.timeouts.keys()][0]);
	expect(context.clients).toHaveLength(3);
	expect(context.clients[2].connect).toHaveBeenCalledWith('wss://alpha.invalid/feed');
	expect(healthy.close).not.toHaveBeenCalled();
});
test('synchronous connect exceptions enter the same bounded retry path', async () => {
	market = exchangeMarket();
	context.manager.setMarketsFromDB([market]);
	context.failNextConnect(new Error('controlled synchronous dial failure'));
	await context.module.connectAndSend([market], ['BTC-USDT']);
	expect(context.module.getWebSocketConnections()['alpha.invalid']).toMatchObject({
		connected: false,
		closeDescription: 'Error: controlled synchronous dial failure',
	});
	const [timer] = clock.timeouts.keys();
	expect(timer.delay).toBe(30000);
	await clock.run(timer);
	expect(context.clients).toHaveLength(2);
});
test('selective close actions currently do nothing while allMarkets closes and cancels pending clients', async () => {
	const socket = await open({ pingFrequencyInSeconds: 3 });
	await context.module.close({ markets: ['Alpha'] });
	expect(socket.close).not.toHaveBeenCalled();
	await context.module.close({ allMarkets: true });
	expect(socket.close).toHaveBeenCalledTimes(1);
});
test('stream lookup filters hosts/case and retains the last-subscription limitation', async () => {
	const socket = await open();
	await deliver(socket, { symbol: 'BTC-USDT', price: 80 });
	expect(Object.keys(context.module.getMarketTickerStream(null, 'btc-usdt'))).toEqual([
		'alpha.invalid',
	]);
	expect(() => context.module.getMarketTickerStream(['Missing'], 'BTC-USDT')).toThrow(
		/tickers.some is not a function/
	);
	await context.module.connectAndSend([market], ['ETH-USD']);
	await deliver(socket, { symbol: 'ETH-USD', price: 100 });
	expect(context.module.getMarketTickerStream(null, 'BTC-USDT')).toEqual({});
	expect(
		context.module.getAllMarketTickerStream()['alpha.invalid'].data.tickerPrices['BTC-USDT']
	).toBe(80);
});
