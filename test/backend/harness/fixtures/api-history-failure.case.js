const { loadHttpApp } = require('../../support/http-app.cjs');

test('actual HTTP history query failure remains unhandled by Express 4', async () => {
	const context = await loadHttpApp();
	context.historySort.mockImplementation(() => {
		throw new Error('B3 HTTP history query rejected');
	});
	await context.api
		.get('/coin-arbitrage/crypto/historical-arbitrages')
		.timeout({ deadline: 750 });
});
