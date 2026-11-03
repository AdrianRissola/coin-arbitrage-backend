const {
	captureTimers,
	connection,
	exchangeMarket,
	loadExchange,
} = require('../../support/ws-runtime.cjs');

let context;
let clock;
afterEach(async () => {
	try {
		await context?.module.close({ allMarkets: true });
	} finally {
		clock?.close();
	}
});
test('actual async exchange callback rejection is not hidden by EventEmitter emit', async () => {
	clock = captureTimers();
	context = loadExchange();
	const market = exchangeMarket();
	context.manager.setMarketsFromDB([market]);
	await context.module.connectAndSend([market], ['BTC-USDT']);
	const socket = connection('alpha.invalid');
	context.clients[0].emit('connect', socket);
	socket.emit('message', { type: 'utf8', utf8Data: 'not json' });
	await new Promise(resolve => {
		setImmediate(resolve);
	});
	expect(context.module.getAllMarketTickerStream()).toEqual({});
});
