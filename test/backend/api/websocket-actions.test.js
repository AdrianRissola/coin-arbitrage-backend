const { loadHttpApp } = require('../support/http-app.cjs');

const route = '/coin-arbitrage/crypto/markets/tickers/websockets';

test('GET WebSocket status relays the controlled exchange-client result unchanged', async () => {
	const context = await loadHttpApp();
	const status = [{ host: 'alpha.invalid', connected: true, closed: false }];
	context.client.getWebSocketConnections.mockReturnValue(status);
	const response = await context.api.get(route).expect(200);
	expect(response.body).toEqual(status);
	expect(context.client.getWebSocketConnections).toHaveBeenCalledTimes(1);
});

test('POST open uses actual service/manager selection and relays the controlled exchange result', async () => {
	const context = await loadHttpApp();
	const status = [{ host: 'alpha.invalid', connected: true }];
	context.client.connectAndSend.mockResolvedValue(status);
	const response = await context.api
		.post(route)
		.send({ action: 'open', markets: ['alpha'], tickers: ['BTC-USDT'] })
		.expect(200);
	expect(response.body).toEqual(status);
	expect(context.client.connectAndSend).toHaveBeenCalledWith([context.markets[0]], ['BTC-USDT']);
	expect(context.client.close).not.toHaveBeenCalled();
});

test('POST close passes the actual action payload to the controlled exchange adapter', async () => {
	const context = await loadHttpApp();
	const payload = { action: 'close', markets: ['Alpha'], tickers: ['BTC-USDT'] };
	context.client.close.mockResolvedValue([{ host: 'alpha.invalid', closed: true }]);
	const response = await context.api.post(route).send(payload).expect(200);
	expect(response.body).toEqual([{ host: 'alpha.invalid', closed: true }]);
	expect(context.client.close).toHaveBeenCalledWith(payload);
});

test.each([{}, { action: 'OPEN' }, { action: 'unknown' }])(
	'POST unsupported action %j returns the existing empty 200',
	async payload => {
		const context = await loadHttpApp();
		const response = await context.api.post(route).send(payload).expect(200);
		expect(response.text).toBe('');
		expect(response.type).toBe('application/json');
		expect(context.client.connectAndSend).not.toHaveBeenCalled();
		expect(context.client.close).not.toHaveBeenCalled();
	}
);
