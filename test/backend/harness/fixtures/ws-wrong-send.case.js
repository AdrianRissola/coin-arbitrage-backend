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
test('wrong ticker expectation against actual exchange subscription', async () => {
	clock = captureTimers();
	context = loadExchange();
	const market = exchangeMarket();
	context.manager.setMarketsFromDB([market]);
	await context.module.connectAndSend([market], ['BTC-USDT']);
	const socket = connection('alpha.invalid');
	context.clients[0].emit('connect', socket);
	expect(socket.sent).toEqual(['{"symbol":"ETH-USD"}']);
});
