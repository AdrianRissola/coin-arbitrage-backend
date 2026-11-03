const { loadHttpApp } = require('../../support/http-app.cjs');

test('a deliberately wrong HTTP status oracle fails against the actual app', async () => {
	const context = await loadHttpApp();
	await context.api.get('/coin-arbitrage/crypto/markets').expect(201);
});
