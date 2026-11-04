const { loadHttpApp } = require('../../support/http-app.cjs');

test('actual HTTP current request forwards one error without a headers-sent failure', async () => {
	const context = await loadHttpApp({
		exchange: [{ error: new Error('B3 HTTP exchange setup failed') }],
	});
	const result = await context.api
		.get('/coin-arbitrage/crypto/current-arbitrages?ticker=BTC-USDT&markets=Alpha,Missing')
		.timeout({ deadline: 750 })
		.expect(500);
	expect(result.type).toBe('application/json');
	expect(result.body).toEqual({
		error: {
			code: 500,
			message: 'INTERNAL SERVER ERROR',
			description: 'B3 HTTP exchange setup failed',
		},
	});
	await context.api.get('/coin-arbitrage/crypto/markets').timeout({ deadline: 750 }).expect(200);
});
