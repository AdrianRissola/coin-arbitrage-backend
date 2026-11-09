const { loadHttpApp } = require('../../support/http-app.cjs');

test('actual HTTP market missing-map failure returns JSON and the server remains usable', async () => {
	const context = await loadHttpApp();
	const result = await context.api
		.post('/coin-arbitrage/crypto/markets')
		.send({})
		.timeout({ deadline: 750 })
		.expect(400);
	expect(result.type).toBe('application/json');
	expect(result.body).toEqual({
		error: { code: 400, message: 'BAD REQUEST', description: 'invalid request' },
	});
	await context.api.get('/coin-arbitrage/crypto/markets').timeout({ deadline: 750 }).expect(200);
});
