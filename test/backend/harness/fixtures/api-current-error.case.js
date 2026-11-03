const { loadHttpApp } = require('../../support/http-app.cjs');

test('actual HTTP current request continues after next and retains its headers-sent failure', async () => {
	const context = await loadHttpApp({
		exchange: [{ error: new Error('B3 HTTP exchange setup failed') }],
	});
	await context.api
		.get('/coin-arbitrage/crypto/current-arbitrages?ticker=BTC-USDT&markets=Alpha,Missing')
		.expect(500);
});
