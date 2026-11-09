const { loadHttpApp } = require('../support/http-app.cjs');

const response = () => ({ json: jest.fn(), status: jest.fn().mockReturnThis() });
const base = '/coin-arbitrage/crypto';

test('missing market forwards NOT_FOUND once without continuing into a dereference', async () => {
	const context = await loadHttpApp({ listen: false });
	const next = jest.fn();
	expect(() =>
		context.controllers.market.getTickerByMarket(
			{ params: { market: 'Missing', ticker: 'BTC-USDT' } },
			response(),
			next
		)
	).not.toThrow();
	expect(next).toHaveBeenCalledTimes(1);
	expect(next).toHaveBeenCalledWith({
		code: 404,
		message: 'NOT FOUND',
		description: 'market Missing not found',
	});
});

test.each(['getAllMarkets', 'getAllMarketTickers'])(
	'%s forwards its real service failure without sending success',
	async action => {
		const context = await loadHttpApp({ listen: false });
		context.manager.setMarketsFromDB(
			action === 'getAllMarkets' ? [null] : [{ name: 'Broken' }]
		);
		const output = response();
		const next = jest.fn();
		const caught = context.waitForError(args => args[0] instanceof TypeError);
		context.controllers.market[action]({ params: { ticker: 'MISSING' } }, output, next);
		await caught;
		expect(output.json).not.toHaveBeenCalled();
		expect(next).toHaveBeenCalledTimes(1);
		expect(next).toHaveBeenCalledWith(expect.any(TypeError));
	}
);

test.each(['save', 'validation'])(
	'POST arbitrage forwards real %s failure without sending success',
	async kind => {
		const context = await loadHttpApp({ listen: false });
		const failure = new Error('controlled arbitrage save failure');
		context.planSave('Arbitrage', kind === 'save' ? { error: failure } : {});
		const output = response();
		const next = jest.fn();
		const caught = context.waitForError(args =>
			kind === 'save' ? args[0] === failure : args[0]?.name === 'ValidationError'
		);
		context.controllers.arbitrage.saveArbitrage(
			{ body: kind === 'save' ? {} : { profitPercentage: 'not-a-number' } },
			output,
			next
		);
		await caught;
		expect(output.json).not.toHaveBeenCalled();
		expect(next).toHaveBeenCalledTimes(1);
		expect(next).toHaveBeenCalledWith(kind === 'save' ? failure : expect.any(Error));
	}
);

test('raw controller missing market tickers forwards BAD_REQUEST through next', async () => {
	const context = await loadHttpApp({ listen: false });
	const output = response();
	const next = jest.fn();
	await context.controllers.market.saveMarket({ body: {} }, output, next);
	expect(output.json).not.toHaveBeenCalled();
	expect(next).toHaveBeenCalledWith(
		expect.objectContaining({ code: 400, message: 'BAD REQUEST' })
	);
});

test.each([
	['currency symbol', 'market', 'saveCurrency', {}, /length/],
	['WebSocket tickers', 'websocket', 'connectWebsocketClient', { action: 'open' }, /some/],
])(
	'raw controller missing %s returns its rejection for the route adapter',
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

test('raw history query returns its rejection for the route adapter', async () => {
	const context = await loadHttpApp({ listen: false });
	const failure = new Error('controlled history query failure');
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

test('current arbitrages stop after forwarding a market-price failure', async () => {
	const context = await loadHttpApp({ listen: false });
	context.manager.setMarketsFromDB([null]);
	const output = response();
	const next = jest.fn();
	await context.controllers.arbitrage.getArbitrages(
		{ query: { ticker: 'BTC-USDT' } },
		output,
		next
	);
	expect(next).toHaveBeenCalledTimes(1);
	expect(output.json).not.toHaveBeenCalled();
});

test.each([
	['get', '/markets', undefined, context => context.manager.setMarketsFromDB([null])],
	['get', '/markets/MISSING', undefined, context => context.manager.setMarketsFromDB([null])],
	[
		'get',
		'/markets/tickers/BTC-USDT/prices',
		undefined,
		context => context.manager.setMarketsFromDB([null]),
	],
	[
		'get',
		'/current-arbitrages?ticker=BTC-USDT',
		undefined,
		context => context.manager.setMarketsFromDB([null]),
	],
	['post', '/markets', {}, () => {}, 400],
	['post', '/currency', {}, () => {}],
	['post', '/markets/tickers/websockets', { action: 'open' }, () => {}],
	[
		'post',
		'/arbitrages',
		{},
		context => context.planSave('Arbitrage', { error: new Error('controlled save failure') }),
	],
	[
		'post',
		'/arbitrages',
		{ profitPercentage: 'not-a-number' },
		context => context.planSave('Arbitrage'),
	],
])(
	'%s %s completes a real JSON error response instead of hanging',
	async (method, path, body, prepare, status = 500) => {
		const context = await loadHttpApp();
		prepare(context);
		const request = context.api[method](`${base}${path}`).timeout({
			response: 1000,
			deadline: 2000,
		});
		if (body !== undefined) request.send(body);
		const result = await request.expect(status);
		expect(result.type).toBe('application/json');
	}
);

test.each([undefined, 'ECONNRESET', 11000, 400])(
	'history query error code %p is forwarded through the real HTTP error middleware',
	async code => {
		const context = await loadHttpApp();
		context.historySort.mockRejectedValue(
			Object.assign(new Error('controlled query failure'), { code })
		);
		const result = await context.api
			.get(`${base}/historical-arbitrages?tickers[]=BTC-USDT`)
			.timeout({ response: 1000, deadline: 2000 })
			.expect(code === 400 ? 400 : 500);
		expect(result.type).toBe('application/json');
	}
);

test('missing POST arbitrage body stops before model persistence', async () => {
	const context = await loadHttpApp({ listen: false });
	const output = response();
	context.controllers.arbitrage.saveArbitrage({}, output, jest.fn());
	expect(output.status).toHaveBeenCalledWith(400);
	expect(output.json).toHaveBeenCalledTimes(1);
	expect(context.saved).toEqual([]);
});
