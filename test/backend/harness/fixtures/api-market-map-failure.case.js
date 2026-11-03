const { loadHttpApp } = require('../../support/http-app.cjs');

test('actual HTTP market missing-map failure remains an unhandled async rejection', async () => {
	const context = await loadHttpApp();
	await context.api.post('/coin-arbitrage/crypto/markets').send({}).timeout({ deadline: 750 });
});
