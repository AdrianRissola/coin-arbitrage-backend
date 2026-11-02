const { loadHttpApp } = require('../support/http-app.cjs');

const response = () => ({ json: jest.fn(), status: jest.fn().mockReturnThis() });

test('direct real market controller forwards NOT_FOUND then still dereferences a missing market', async () => {
	const context = await loadHttpApp({ listen: false });
	const next = jest.fn();
	expect(() =>
		context.controllers.market.getTickerByMarket(
			{ params: { market: 'Missing', ticker: 'BTC-USDT' } },
			response(),
			next
		)
	).toThrow(TypeError);
	expect(next).toHaveBeenCalledWith({
		code: 404,
		message: 'NOT FOUND',
		description: 'market Missing not found',
	});
});

test('direct GET markets catches real DTO failure and makes no response or next call after its catch settles', async () => {
	const context = await loadHttpApp({ listen: false });
	context.manager.setMarketsFromDB([null]);
	const output = response();
	const next = jest.fn();
	const caught = context.waitForError(args => args[0] instanceof TypeError);
	expect(context.controllers.market.getAllMarkets({}, output, next)).toBeUndefined();
	await caught;
	expect(output.json).not.toHaveBeenCalled();
	expect(next).not.toHaveBeenCalled();
});

test('direct GET all tickers catches real missing-map failure without completing the HTTP response', async () => {
	const context = await loadHttpApp({ listen: false });
	context.manager.setMarketsFromDB([{ name: 'Broken', availableTickersToMarketTickers: {} }]);
	const output = response();
	const caught = context.waitForError(args => args[0] instanceof TypeError);
	context.controllers.market.getAllMarketTickers({ params: { ticker: 'MISSING' } }, output);
	await caught;
	expect(output.json).not.toHaveBeenCalled();
});

test('direct POST arbitrage swallows the actual controlled model rejection without responding', async () => {
	const context = await loadHttpApp({ listen: false });
	const failure = new Error('B3 rejected arbitrage save');
	context.planSave('Arbitrage', { error: failure });
	const output = response();
	const caught = context.waitForError(args => args[0] === failure);
	context.controllers.arbitrage.saveArbitrage({ body: {} }, output);
	await caught;
	expect(output.json).not.toHaveBeenCalled();
});

test('direct POST arbitrage real validation failure is logged without inventing an error envelope', async () => {
	const context = await loadHttpApp({ listen: false });
	context.planSave('Arbitrage');
	const output = response();
	const caught = context.waitForError(args => args[0]?.name === 'ValidationError');
	context.controllers.arbitrage.saveArbitrage(
		{ body: { profitPercentage: 'not-a-number' } },
		output
	);
	await caught;
	expect(output.json).not.toHaveBeenCalled();
});

test.each([
	['market map', 'market', 'saveMarket', {}, /Cannot convert undefined or null to object/],
	['currency symbol', 'market', 'saveCurrency', {}, /length/],
	['WebSocket tickers', 'websocket', 'connectWebsocketClient', { action: 'open' }, /some/],
])(
	'direct async missing %s retains its rejected promise, not an Express fallback',
	async (name, controller, action, body, message) => {
		const context = await loadHttpApp({ listen: false });
		const output = response();
		const next = jest.fn();
		await expect(
			context.controllers[controller][action]({ body }, output, next)
		).rejects.toThrow(message);
		expect(output.json).not.toHaveBeenCalled();
		expect(next).not.toHaveBeenCalled();
	}
);

test('direct history query rejection propagates instead of calling next or sending a response', async () => {
	const context = await loadHttpApp({ listen: false });
	const failure = new Error('B3 history query rejected');
	context.historySort.mockRejectedValue(failure);
	const output = response();
	const next = jest.fn();
	await expect(
		context.controllers.arbitrage.getAllHistoricalArbitrages(
			{ query: { tickers: ['BTC-USDT'] } },
			output,
			next
		)
	).rejects.toBe(failure);
	expect(output.json).not.toHaveBeenCalled();
	expect(next).not.toHaveBeenCalled();
});
