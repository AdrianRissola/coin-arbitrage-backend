const { loadHttpApp } = require('../../support/http-app.cjs');

test('actual HTTP history failure returns JSON and a later history request succeeds', async () => {
	const context = await loadHttpApp();
	context.historySort.mockImplementation(() => {
		throw new Error('B3 HTTP history query rejected');
	});
	const result = await context.api
		.get('/coin-arbitrage/crypto/historical-arbitrages')
		.timeout({ deadline: 750 })
		.expect(500);
	expect(result.type).toBe('application/json');
	expect(result.body).toEqual({});
	context.historySort.mockResolvedValue([]);
	const recovered = await context.api
		.get('/coin-arbitrage/crypto/historical-arbitrages')
		.timeout({ deadline: 750 })
		.expect(200);
	expect(recovered.body).toEqual([]);
});
